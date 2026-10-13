import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

/**
 * Dev-only endpoints for the splat viewer's tools (?tune, ?create), mounted at
 * /__splats. Registered for `vite` only (apply: 'serve'), so none of this
 * exists in the built site.
 *
 *   GET  /drafts/:file            a draft scan's .spz, from splat-drafts/ (never in public/)
 *   POST /settings/:scan          Tune's settings, to src/pages/splats/settings/:scan.json
 *   GET  /erase/:scan             the splats Tune's brush took out, as saved (204: none)
 *   POST /erase/:scan             save them, to src/pages/splats/settings/:scan.erase.bin
 *   GET  /shots/:scan             the scan's shot names
 *   GET  /shots/:scan/:name       one shot
 *   POST /shots/:scan/:name       save a shot, to src/pages/splats/shots/:scan/:name.json
 *   GET  /disk                    free bytes where renders go
 *   POST /render/start            { name, format, width, height, fps }, answers { id, path }
 *   POST /render/:id/frame        one raw RGBA frame, bottom row first (WebGL order)
 *   POST /render/:id/finish       closes the file, answers { path, bytes }
 *   POST /render/:id/cancel       stops ffmpeg and deletes what it wrote
 *   POST /reveal                  { path }: shows a render in Finder
 *
 * Renders are encoded by the ffmpeg on the PATH, fed frame by frame through
 * its stdin, so the browser never holds more than one frame.
 *
 * Files this plugin writes don't hot-reload the page. The settings are
 * glob-imported by scans.ts, and a hot update would rebuild the whole viewer
 * (Fast Refresh re-runs every effect), so Tune keeps its copy up to date
 * itself (rememberSettings). Edits by hand still hot-reload as usual.
 */

const RENDERS = path.join(os.homedir(), 'Movies', 'Splat Renders')
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/
const DRAFT = /^[a-z0-9][a-z0-9-]{0,63}(\.preview|\.sky)?\.spz$/
/** How long after a write of ours the file watcher's echo of it is ignored. */
const ECHO_MS = 3000

export type RenderFormat = 'mp4' | 'prores' | 'png'

/** What each format writes, after the shared raw-video input. */
const ENCODE: Record<RenderFormat, { ext: string; args: string[] }> = {
  mp4: { ext: '.mp4', args: ['-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'] },
  prores: { ext: '.mov', args: ['-c:v', 'prores_ks', '-profile:v', '3', '-vendor', 'apl0', '-pix_fmt', 'yuv422p10le'] },
  png: { ext: '', args: ['-c:v', 'png'] },
}

interface Render {
  proc: ChildProcessWithoutNullStreams
  /** The file, or for PNG the folder of frames. */
  out: string
  stderr: string
  exited: Promise<number | null>
}

const readBody = (req: IncomingMessage) => new Promise<Buffer>((resolve, reject) => {
  const chunks: Buffer[] = []
  req.on('data', (chunk: Buffer) => chunks.push(chunk))
  req.on('end', () => resolve(Buffer.concat(chunks)))
  req.on('error', reject)
})

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

const sizeOf = (p: string): number => {
  const stat = fs.statSync(p)
  return stat.isDirectory() ? fs.readdirSync(p).reduce((sum, f) => sum + sizeOf(path.join(p, f)), 0) : stat.size
}

/** Local time as "2026-10-04 02.31.07": sorts by date, and safe in a file name. */
const stamp = () => {
  const d = new Date()
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}.${two(d.getMinutes())}.${two(d.getSeconds())}`
}

export const splatStudio = (): Plugin => {
  /** Files this plugin wrote, and when. */
  const written = new Map<string, number>()
  const write = (file: string, data: string | Buffer) => {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    written.set(file, Date.now())
    fs.writeFileSync(file, data)
  }

  return {
    name: 'splat-studio',
    apply: 'serve',
    hotUpdate({ file }) {
      const at = written.get(file)
      if (at !== undefined && Date.now() - at < ECHO_MS) return []
    },
    configureServer(server) {
      const root = server.config.root
      const settingsDir = path.join(root, 'src/pages/splats/settings')
      const shotsDir = path.join(root, 'src/pages/splats/shots')
      const renders = new Map<string, Render>()
      let nextId = 1

      server.middlewares.use('/__splats', (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
        const method = req.method ?? 'GET'

        const handle = async () => {
          // Draft scans: kept out of public/, so a build can't publish them before they're picked.
          if (method === 'GET' && parts[0] === 'drafts' && DRAFT.test(parts[1] ?? '')) {
            const file = path.join(root, 'splat-drafts', parts[1])
            if (!fs.existsSync(file)) return send(res, 404, { error: 'no such draft' })
            res.setHeader('content-type', 'application/octet-stream')
            // Spark shows load progress from it.
            res.setHeader('content-length', fs.statSync(file).size)
            fs.createReadStream(file).pipe(res)
            return
          }

          // Tune's settings.
          if (method === 'POST' && parts[0] === 'settings' && SLUG.test(parts[1] ?? '')) {
            const settings = JSON.parse((await readBody(req)).toString('utf8'))
            write(path.join(settingsDir, `${parts[1]}.json`), JSON.stringify(settings, null, 2) + '\n')
            return send(res, 200, { ok: true })
          }

          // The brush's selection: little-endian Uint32s, the scan's splat count and then the
          // indices taken out (format in src/pages/splats/filters.ts). Nothing taken, no file.
          if (parts[0] === 'erase' && SLUG.test(parts[1] ?? '') && parts.length === 2) {
            const file = path.join(settingsDir, `${parts[1]}.erase.bin`)
            if (method === 'GET') {
              // Nothing painted out yet is no error: an empty answer, not a 404 in the console.
              if (!fs.existsSync(file)) {
                res.statusCode = 204
                return res.end()
              }
              res.setHeader('content-type', 'application/octet-stream')
              return res.end(fs.readFileSync(file))
            }
            if (method === 'POST') {
              const body = await readBody(req)
              if (body.length < 4 || body.length % 4) return send(res, 400, { error: 'not a list of Uint32s' })
              if (body.length === 4) {
                written.set(file, Date.now())
                fs.rmSync(file, { force: true })
              } else {
                write(file, body)
              }
              return send(res, 200, { ok: true, erased: body.length / 4 - 1 })
            }
          }

          // Shots: fetched rather than imported, so saving one doesn't hot-reload the editor.
          if (parts[0] === 'shots' && SLUG.test(parts[1] ?? '')) {
            const dir = path.join(shotsDir, parts[1])
            if (parts.length === 2 && method === 'GET') {
              const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort() : []
              return send(res, 200, names)
            }
            if (parts.length === 3 && SLUG.test(parts[2])) {
              const file = path.join(dir, `${parts[2]}.json`)
              if (method === 'GET') {
                if (!fs.existsSync(file)) return send(res, 404, { error: 'no such shot' })
                return send(res, 200, JSON.parse(fs.readFileSync(file, 'utf8')))
              }
              if (method === 'POST') {
                const shot = JSON.parse((await readBody(req)).toString('utf8'))
                write(file, JSON.stringify(shot, null, 2) + '\n')
                return send(res, 200, { ok: true })
              }
            }
          }

          if (method === 'GET' && parts[0] === 'disk') {
            fs.mkdirSync(RENDERS, { recursive: true })
            const stat = fs.statfsSync(RENDERS)
            return send(res, 200, { free: stat.bavail * stat.bsize, dir: RENDERS })
          }

          if (method === 'POST' && parts[0] === 'render' && parts[1] === 'start') {
            const { name, format, width, height, fps } = JSON.parse((await readBody(req)).toString('utf8'))
            const encode = ENCODE[format as RenderFormat]
            if (!encode || !(width > 0 && height > 0 && fps > 0) || width % 2 || height % 2) {
              return send(res, 400, { error: 'bad render settings' })
            }
            fs.mkdirSync(RENDERS, { recursive: true })
            const base = `${String(name).replace(/[/\\:]/g, '-')} – ${stamp()}`
            const out = path.join(RENDERS, base + encode.ext)
            if (format === 'png') fs.mkdirSync(out, { recursive: true })
            const target = format === 'png' ? path.join(out, 'frame_%05d.png') : out
            const proc = spawn('ffmpeg', [
              '-hide_banner', '-loglevel', 'error', '-y',
              '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-r', String(fps), '-i', 'pipe:0',
              // WebGL reads rows bottom first.
              '-vf', 'vflip',
              ...encode.args,
              target,
            ])
            const render: Render = {
              proc,
              out,
              stderr: '',
              exited: new Promise((resolve) => proc.on('close', resolve)),
            }
            proc.stderr.on('data', (chunk: Buffer) => { render.stderr += chunk.toString() })
            // A closed pipe surfaces on the next write; don't let it crash the dev server.
            proc.stdin.on('error', () => {})
            const id = String(nextId++)
            renders.set(id, render)
            return send(res, 200, { id, path: out })
          }

          if (method === 'POST' && parts[0] === 'render' && parts[1] && renders.has(parts[1])) {
            const render = renders.get(parts[1])!
            const action = parts[2]
            if (action === 'frame') {
              const frame = await readBody(req)
              if (render.proc.exitCode !== null) return send(res, 500, { error: render.stderr || 'ffmpeg stopped' })
              if (!render.proc.stdin.write(frame)) {
                await new Promise<void>((resolve) => render.proc.stdin.once('drain', () => resolve()))
              }
              return send(res, 200, { ok: true })
            }
            if (action === 'finish') {
              render.proc.stdin.end()
              const code = await render.exited
              renders.delete(parts[1])
              if (code !== 0) return send(res, 500, { error: render.stderr || `ffmpeg exited with ${code}` })
              return send(res, 200, { path: render.out, bytes: sizeOf(render.out) })
            }
            if (action === 'cancel') {
              render.proc.kill('SIGKILL')
              await render.exited
              renders.delete(parts[1])
              fs.rmSync(render.out, { recursive: true, force: true })
              return send(res, 200, { ok: true })
            }
          }

          if (method === 'POST' && parts[0] === 'reveal') {
            const { path: target } = JSON.parse((await readBody(req)).toString('utf8'))
            // Only ever something this plugin wrote.
            if (typeof target !== 'string' || !path.resolve(target).startsWith(RENDERS + path.sep)) {
              return send(res, 400, { error: 'not a render' })
            }
            spawn('open', ['-R', target])
            return send(res, 200, { ok: true })
          }

          next()
        }

        handle().catch((error: unknown) => send(res, 500, { error: String(error) }))
      })
    },
  }
}
