import {
    SiAdobeaftereffects,
    SiAdobepremierepro,
    SiAdobephotoshop,
    SiUnrealengine,
    SiBlender,
    SiReact,
    SiDavinciresolve,
    SiHoudini,
    SiAdobeaudition,
    SiRaspberrypi,
    SiBambulab
} from 'react-icons/si';
import { Camera, Mail, Database, Box, Mic, Printer, Layers } from 'lucide-react';
import type { ComponentType } from 'react';
import TouchDesignerIcon from '../components/TouchDesignerIcon';

export interface ProjectMedia {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
}

// Self-hosted WebAR viewer (github.com/BaronRobin/artivive), deployed separately.
// A project's `ar` slug points at its artwork viewer: `${AR_BASE_URL}/ar/<slug>/`.
export const AR_BASE_URL = 'https://baronrobin.github.io/artivive';

export const arViewerUrl = (slug: string) => `${AR_BASE_URL}/ar/${slug}/`;

/** The projects with a page of their own instead of the gallery, each recreating its deck. */
export const LAUTWASSER_ID = '11-lautwasser';
export const BACHELOR_ID = '00-bachelor';

/** Also its own page (src/pages/splats): the live viewer is the whole project. */
export const SPLATS_ID = '13-splats';

export interface Project {
    id: string;
    title: string;
    category: string;
    link?: string;
    ar?: string; // AR viewer slug, set once the artwork has a PersonalAR overlay
    description: string;
    folderName: string; // Helper for public folder path
    /**
     * Kept in the data but not shown anywhere: neither listed nor reachable by
     * URL. For work that isn't ready to stand next to the rest yet. Flip this
     * and move the folder back from _hidden_projects/ into public/projects/ to
     * restore it.
     *
     * A project with a page of its own (see BACHELOR_ID) is only unlisted by
     * this: its route in App.tsx still answers a direct link, so its media
     * stays in public/projects/.
     */
    hidden?: boolean;
    media: ProjectMedia[];
    technicals?: {
        icons: ComponentType<{ className?: string }>[];
        columns: string[][];
    };
}

export const projects: Project[] = [
    {
        // Has its own page (src/pages/lautwasser), which recreates the deck it
        // was presented with; the route in App.tsx outranks /project/:id. Only
        // the grid tile and the tools card read this entry.
        id: LAUTWASSER_ID,
        title: 'Lautwasser',
        category: 'Interactive Installation',
        description: 'Underwater recordings of the Lauter turned into an interactive sound visualisation.',
        folderName: '11_lautwasser',
        media: [
            {
                type: 'video',
                url: '/projects/11_lautwasser/title.webm',
                thumbnail: '/projects/11_lautwasser/title.poster.jpg',
            },
        ],
        technicals: {
            icons: [TouchDesignerIcon, SiAdobeaudition, SiRaspberrypi, Mic, Printer],
            columns: [
                [
                    'Unterwasseraufnahmen an den offenen Stationen der Lauter',
                    'Audiospektralanalyse 24 vs. 32 Bit',
                    'Geräusche als Daten'
                ],
                [
                    'Soundreaktive Visuals in TouchDesigner',
                    'Effekte aus den Aufnahmen',
                    'Die Lauter als Persona',
                    'Zustände der Installation'
                ],
                [
                    'Lautstärkeregler am Raspberry Pi, per OSC',
                    '3D-gedruckte Stele',
                    'Ausstellungsraum'
                ]
            ]
        }
    },
    {
        // The Bachelor thesis, with its own page (src/pages/bachelor) like
        // Lautwasser's: the deck, read out of the presentation, and a project
        // page. Only the grid tile and the tools card read this entry.
        //
        // Unlisted until the page and the deck have been reviewed: no tile in
        // the grid, but /project/00-bachelor and its slides still open by
        // direct link. Drop `hidden` to list it.
        id: BACHELOR_ID,
        hidden: true,
        title: '3D Grillz',
        category: 'Bachelor Thesis',
        description: 'A digital pipeline for custom dental grillz, from the scan of a set of teeth to a piece ready for casting.',
        folderName: '00_bachelor',
        media: [
            {
                type: 'image',
                url: '/projects/00_bachelor/image116.jpg',
            },
        ],
        technicals: {
            icons: [SiBlender, SiUnrealengine, SiBambulab, Printer],
            columns: [
                [
                    'Intraoralscan beim Zahnarzt, als STL',
                    'Blender-Einheiten in Millimetern, STL-Import mit Skalierung 0,001',
                    'Datenaufbereitung: schwebende Vertices entfernt, kaputte Zähne repariert'
                ],
                [
                    'Mask, Extract, Sculpt in ZBrush',
                    'Boolean in Blender',
                    'FDM-Prototyp: 3 g Filament, 30 Minuten, 101 % gegen PLA-Schrumpfung'
                ],
                [
                    'Rendering in Unreal Engine: Licht-Setup, Grillz-Viewer, Material Node Tree',
                    'Echtwelt-Materialien: Gold, Sterling Silber, Titan, Rosegold (ISO 10993)',
                    'Guss: Resin-Druck, Gussform, Guss, Post-Processing'
                ]
            ]
        }
    },
    {
        // Its own page (src/pages/splats), routed ahead of /project/:id like
        // Lautwasser. Only the grid tile reads this entry.
        id: SPLATS_ID,
        title: 'Gaussian Splats',
        category: 'Interactive 3D',
        description: 'Places scanned from photos and trained as Gaussian splats, to look around in the browser.',
        folderName: '13_splats',
        // The splat, then its points: the poster is the video's first frame, so the hover picks up where the still is.
        media: [{ type: 'video', url: '/projects/13_splats/hero.webm', thumbnail: '/projects/13_splats/hero.webp' }],
    },
    {
        id: '01-polarise',
        title: 'Polarise - AI Hub',
        category: 'Arch Viz',
        description: 'A comprehensive AI hub design system focusing on clarity and utility.',
        folderName: '01_polarise',
        media: [
            { type: 'image', url: '/projects/01_polarise/cover.jpg' },
            { type: 'image', url: '/projects/01_polarise/01_Datacenter_Outdoor.jpg' },
            {
                type: 'video',
                url: '/projects/01_polarise/Polarise_1.webm',
                thumbnail: '/projects/01_polarise/Polarise_1.poster.jpg',
            },
            { type: 'image', url: '/projects/01_polarise/02_PV_Anlage.jpg' },
            { type: 'image', url: '/projects/01_polarise/03_Office.jpg' },
            { type: 'image', url: '/projects/01_polarise/04_Kitchen.jpg' },
            { type: 'image', url: '/projects/01_polarise/05_Meeting.jpg' },
            { type: 'image', url: '/projects/01_polarise/06_Rack.jpg' },
            { type: 'image', url: '/projects/01_polarise/07_Pods.jpg' },
            { type: 'image', url: '/projects/01_polarise/08_OverallDC.jpg' },
            { type: 'image', url: '/projects/01_polarise/09_UPS.jpg' },
            { type: 'image', url: '/projects/01_polarise/10_Cooling.jpg' },
            { type: 'image', url: '/projects/01_polarise/11_Focus_Zone.jpg' },
        ],
        technicals: {
            icons: [SiAdobeaftereffects, SiAdobepremierepro, SiAdobephotoshop, SiUnrealengine],
            columns: [
                [
                    'Postproduction inklusive Crypomattes',
                    'Color Correction'
                ],
                [
                    'Level Sequencer',
                    'MovieRenderQueue',
                    'Layout 3D',
                    'Rendering mit Passes',
                    'Camera',
                    'Lighting',
                    'Materials',
                    'PathTracing',
                    'Blueprint Coding'
                ]
            ]
        }
    },
    {
        id: '05-dashboard',
        title: 'Dashboard',
        category: 'UI/UX',
        description: 'Data visualization dashboard design for enterprise metrics.',
        folderName: '05_dashboard',
        media: [
            {
                type: 'video',
                url: '/projects/05_dashboard/relticc_Experience_Pro_Platform.webm',
                thumbnail: '/projects/05_dashboard/relticc_Experience_Pro_Platform.poster.jpg',
            },
            { type: 'image', url: '/projects/05_dashboard/01.jpg' },
            { type: 'image', url: '/projects/05_dashboard/02.jpg' },
            { type: 'image', url: '/projects/05_dashboard/03.jpg' },
            { type: 'image', url: '/projects/05_dashboard/04.jpg' },
            { type: 'image', url: '/projects/05_dashboard/05.jpg' },
            { type: 'image', url: '/projects/05_dashboard/06.jpg' },
            { type: 'image', url: '/projects/05_dashboard/07.jpg' }
        ],
        technicals: {
            icons: [SiReact, Database, Mail],
            columns: [
                [
                    'Gebaut mit:',
                    'react (UI)',
                    'sql (Daten)',
                    'Postmark (Email-Verkehr)'
                ]
            ]
        }
    },
    {
        id: '07-kitchen-visualisation',
        title: 'Kitchen Visualisation',
        category: 'ArchViz',
        description: 'Photorealistic kitchen rendering and lighting setup.',
        folderName: '07_kitchen_visualisation',
        media: [
            { type: 'image', url: '/projects/07_kitchen_visualisation/cover.webp' },
            {
                type: 'video',
                url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3_1.webm',
                thumbnail: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3_1.poster.jpg',
            },
            {
                type: 'video',
                url: '/projects/07_kitchen_visualisation/relticc_3d_exp_pro_kitchen_1.webm',
                thumbnail: '/projects/07_kitchen_visualisation/relticc_3d_exp_pro_kitchen_1.poster.jpg',
            },
            { type: 'image', url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3 (0;00;01;21).jpg' },
            { type: 'image', url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3 (0;00;02;14).jpg' },
            { type: 'image', url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3 (0;00;03;03).jpg' },
            { type: 'image', url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3 (0;00;05;13).jpg' },
            { type: 'image', url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3 (0;00;09;00).jpg' },
            { type: 'image', url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3 (0;00;09;16).jpg' },
            { type: 'image', url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3 (0;00;11;22).jpg' },
            { type: 'image', url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3 (0;00;12;19).jpg' },
            { type: 'image', url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3 (0;00;14;00).jpg' }
        ],
        technicals: {
            icons: [SiUnrealengine, SiAdobeaftereffects],
            columns: [
                [
                    'Postproduction inklusive Crypomattes',
                    'Video Cutting',
                    'Transitions',
                    'Masking',
                    'Color Correction'
                ],
                [
                    'Level Sequencer',
                    'MovieRenderQueue',
                    'Layout 3D',
                    'Rendering mit Passes',
                    'Camera',
                    'Lighting',
                    'Materials',
                    'PathTracing'
                ]
            ]
        }
    },
    {
        id: '02-3d-video',
        title: '3D Video',
        category: 'Launch',
        description: 'Launch video of Company Rebranding.',
        folderName: '02_3d_video',
        media: [
            { type: 'image', url: '/projects/02_3d_video/cover.jpg' },
            {
                type: 'video',
                url: '/projects/02_3d_video/Gatti_Lauch_3D_Video_1.webm',
                thumbnail: '/projects/02_3d_video/Gatti_Lauch_3D_Video_1.poster.jpg',
            },
            { type: 'image', url: '/projects/02_3d_video/01.jpg' },
            { type: 'image', url: '/projects/02_3d_video/02.jpg' },
            { type: 'image', url: '/projects/02_3d_video/03.jpg' },
            { type: 'image', url: '/projects/02_3d_video/04.jpg' },
            { type: 'image', url: '/projects/02_3d_video/05.jpg' },
            { type: 'image', url: '/projects/02_3d_video/06.jpg' },
            { type: 'image', url: '/projects/02_3d_video/timeline.jpg' }
        ],
        technicals: {
            icons: [SiAdobeaftereffects, SiAdobepremierepro, SiBlender, SiUnrealengine],
            columns: [
                [
                    'Postproduction inklusive Crypomattes',
                    'Video Cutting',
                    'Text Animation',
                    'Masking',
                    'Captions',
                    'Color Correction'
                ],
                [
                    'Particle Simulation + Rendering (Eevee)',
                    '3D Modeling'
                ],
                [
                    'Level Sequencer',
                    'MovieRenderQueue',
                    'Layout 3D',
                    'Rendering mit Passes',
                    'Animation Ventilatoren',
                    'Camera',
                    'Lighting',
                    'Materials'
                ]
            ]
        }
    },
    {
        id: '06-houdini',
        title: 'Houdini Explorations',
        category: 'VFX / Simulation',
        description: 'Procedural generation and simulation studies in Houdini.',
        folderName: '06_houdini',
        media: [
            { type: 'video', url: '/projects/06_houdini/Houdini_1.webm', thumbnail: '/projects/06_houdini/cover.webp' },
            { type: 'image', url: '/projects/06_houdini/houd_01.webp' },
            { type: 'image', url: '/projects/06_houdini/houd_02.webp' },
            { type: 'image', url: '/projects/06_houdini/houd_03.webp' },
            { type: 'image', url: '/projects/06_houdini/houd_04.webp' }
        ],
        technicals: {
            icons: [SiDavinciresolve, SiHoudini],
            columns: [
                [
                    'Postproduction',
                    'Video Cutting',
                    'Transitions',
                    'Masking',
                    'Color Correction'
                ],
                [
                    'Vellum Simulation',
                    'Rendering',
                    'Lighting',
                    'Camera',
                    'Materials & stress Parameter as color driver'
                ]
            ]
        }
    },
    {
        id: '03-gatti-interviews',
        title: 'Gatti Interviews',
        category: 'Video Production',
        description: 'Interview series editing and color grading.',
        folderName: '03_gatti_interviews',
        media: [
            {
                type: 'video',
                url: '/projects/03_gatti_interviews/2025-11-06_Gatti_People_Video_Christof_relticc_Soundtrack_1.webm',
                thumbnail: '/projects/03_gatti_interviews/2025-11-06_Gatti_People_Video_Christof_relticc_Soundtrack_1.poster.jpg',
            },
            {
                type: 'video',
                url: '/projects/03_gatti_interviews/Timeline_TeamVideo.mp4',
                thumbnail: '/projects/03_gatti_interviews/Timeline_TeamVideo.poster.jpg',
            },
            {
                type: 'video',
                url: '/projects/03_gatti_interviews/2025-11-06_Gatti_People_Video_Team_relticc_Soundtrack_1.webm',
                thumbnail: '/projects/03_gatti_interviews/2025-11-06_Gatti_People_Video_Team_relticc_Soundtrack_1.poster.jpg',
            },
            { type: 'image', url: '/projects/03_gatti_interviews/timeline.jpg' }
        ],
        technicals: {
            icons: [SiAdobeaftereffects, SiAdobepremierepro, SiBlender, SiUnrealengine, Camera],
            columns: [
                [
                    'Postproduction inklusive Crypomattes',
                    'Video Cutting',
                    'Text Animation',
                    'Masking',
                    'Captions',
                    'Color Correction'
                ],
                [
                    'Particle Simulation + Rendering (Eevee)',
                    '3D Modeling',
                    'Real Life Footage filming mit Gimbal',
                    'Shotlist Working',
                    'Audio Setup'
                ],
                [
                    'Level Sequencer',
                    'MovieRenderQueue',
                    'Layout 3D',
                    'Rendering mit Passes',
                    'Animation Ventilatoren',
                    'Camera',
                    'Lighting',
                    'Materials'
                ]
            ]
        }
    },
    {
        id: '04-smart-city',
        title: 'Smart City',
        category: '3D Visualization',
        description: 'Point Cloud to Unreal Mesh',
        folderName: '04_smart_city',
        media: [
            { type: 'video', url: '/projects/04_smart_city/demo.webm', thumbnail: '/projects/04_smart_city/cover.webp' },
            { type: 'image', url: '/projects/04_smart_city/cover.webp' },
            { type: 'image', url: '/projects/04_smart_city/1.jpg' },
            { type: 'image', url: '/projects/04_smart_city/2.jpg' },
            { type: 'image', url: '/projects/04_smart_city/3.jpg' },
            { type: 'image', url: '/projects/04_smart_city/4.jpg' }
        ],
        technicals: {
            icons: [SiAdobeaftereffects, Box, SiUnrealengine],
            columns: [
                [
                    'Postproduction inklusive Crypomattes',
                    'Video Cutting',
                    'Transitions',
                    'Masking',
                    'Color Correction',
                    'Text Animation',
                    'MoGraph'
                ],
                [
                    'Unreal Mesh to LiDAR Pointcloud'
                ],
                [
                    'Level Sequencer',
                    'MovieRenderQueue',
                    'Layout 3D',
                    'Rendering mit Passes',
                    'Animation Laternen',
                    'Camera',
                    'Lighting',
                    'Materials'
                ]
            ]
        }
    },
    {
        id: '08-freisteller',
        hidden: true,
        title: 'Freisteller Modular DC',
        category: 'Commercial',
        description: 'Modular data center visualization and product showcase.',
        folderName: '08_freisteller',
        media: [
            { type: 'image', url: '/projects/08_freisteller/ND_MD_OverallDC.webp' },
            { type: 'image', url: '/projects/08_freisteller/ND_MD_Rack_Double.webp' },
            { type: 'image', url: '/projects/08_freisteller/ND_MD_Rackrow_Back.webp' },
            { type: 'image', url: '/projects/08_freisteller/ND_MD_OverallDC_Layered.webp' },
            { type: 'image', url: '/projects/08_freisteller/ND_MD_Rack_Single_Back.webp' },
            { type: 'image', url: '/projects/08_freisteller/ND_MD_Rackrow_Front.webp' },
            { type: 'image', url: '/projects/08_freisteller/ND_MD_OverallDC_perspective.webp' },
            { type: 'image', url: '/projects/08_freisteller/ND_MD_Rack_Single_Front.webp' }
        ],
        technicals: {
            icons: [SiUnrealengine, SiAdobeaftereffects, SiBlender],
            columns: [
                [
                    'Studio Setup',
                    'Rendering mit Passes',
                    'Lighting',
                    'Modular Modeling'
                ],
                [
                    'Postproduction',
                    'Freisteller Workflow',
                    'Color Correction',
                    'Retouching'
                ]
            ]
        }
    },
    {
        id: '09-fotogrammetrie',
        hidden: true,
        title: 'Fotogrammetrie & Gaussians',
        category: 'Personal Interest',
        description: 'Research into photogrammetry and 3D Gaussian Splatting workflows.',
        folderName: '09_fotogrammetrie',
        media: [
            { type: 'image', url: '/projects/09_fotogrammetrie/fotogrammetrie.jpg' },
            { type: 'video', url: '/projects/09_fotogrammetrie/stone.mp4' },
            { type: 'video', url: '/projects/09_fotogrammetrie/hands.mp4' },
            { type: 'image', url: '/projects/09_fotogrammetrie/hands.jpg' },
            { type: 'video', url: '/projects/09_fotogrammetrie/well.mp4' },
            { type: 'video', url: '/projects/09_fotogrammetrie/castle1.mp4' },
            { type: 'video', url: '/projects/09_fotogrammetrie/castle2.mp4' },
            { type: 'image', url: '/projects/09_fotogrammetrie/castlerender.jpg' }
        ],
        technicals: {
            icons: [Camera, SiBlender, SiUnrealengine],
            columns: [
                [
                    'Processing in Agisoft Metashape',
                    'High Poly Mesh Generation',
                    'Texture Projection',
                    'Point Cloud Cleanup'
                ],
                [
                    'Rendering in Blender',
                    'Cycles Engine',
                    'Gaussian Splatting Import',
                    'Lighting Setup'
                ],
                [
                    'Unreal Engine 5',
                    'Lumen & Nanite',
                    'Level Sequencer',
                    'Movie Render Queue'
                ]
            ]
        }
    },
    {
        id: '10-projection-mapping',
        hidden: true,
        title: 'Projection Mapping',
        category: 'Event Tech',
        description: 'First steps in MadMapper.',
        folderName: '10_projection_mapping',
        media: [
            { type: 'video', url: '/projects/10_projection_mapping/demo.webm', thumbnail: '/projects/10_projection_mapping/cover.webp' },
            { type: 'image', url: '/projects/10_projection_mapping/cover.webp' }
        ],
        technicals: {
            icons: [SiAdobeaftereffects, Box],
            columns: [
                [
                    'Effekterstellung',
                    'Platzhalter zum Mappen',
                    'Animationen',
                    'Musikabstimmung'
                ],
                [
                    'Mapping in Echtwelt'
                ]
            ]
        }
    },
    {
        // A skeleton to fill in, hidden until it is. The six pictures in
        // _hidden_projects/12_3d_printing/ are placeholders, each named for the
        // photo that replaces it: save the photos over 01.jpg to 06.jpg (01 is
        // also the grid tile), move the folder back to public/projects/ and
        // drop `hidden`. Nothing else here needs to change.
        id: '12-3d-printing',
        hidden: true,
        title: '3D Printing',
        category: 'Fabrication',
        description: 'Bambu Lab P2S with AMS 2 Pro: PLA, PETG and TPU on 0.2, 0.4 and 0.6 mm nozzles.',
        folderName: '12_3d_printing',
        media: [
            { type: 'image', url: '/projects/12_3d_printing/01.jpg' },
            { type: 'image', url: '/projects/12_3d_printing/02.jpg' },
            { type: 'image', url: '/projects/12_3d_printing/03.jpg' },
            { type: 'image', url: '/projects/12_3d_printing/04.jpg' },
            { type: 'image', url: '/projects/12_3d_printing/05.jpg' },
            { type: 'image', url: '/projects/12_3d_printing/06.jpg' }
        ],
        technicals: {
            icons: [SiBambulab, Printer, Layers],
            columns: [
                ['Bambu Lab P2S', 'AMS 2 Pro'],
                ['PLA', 'PETG', 'TPU'],
                ['650+ Druckstunden', 'Düsen: 0,2 / 0,4 / 0,6 mm']
            ]
        }
    },
    {
        // Not released yet: drop `hidden` to list it.
        id: '14-boulderapp',
        hidden: true,
        title: 'the boulderapp',
        category: 'Interactive 3D',
        link: 'https://the-boulderapp.vercel.app',
        description: 'A 3D twin of a bouldering gym in the browser: climbers log their sends on the real walls, setters build routes. Running at RockTown Kaiserslautern.',
        folderName: '14_boulderapp',
        media: []
    },
];

/** What actually gets listed and linked. */
export const visibleProjects = projects.filter((p) => !p.hidden);
