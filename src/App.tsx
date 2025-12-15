import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Github,
  Instagram,
  Mail,
  ChevronDown,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import {
  SiUnrealengine,
  SiHoudini,
  SiBlender,
  SiAdobe,
  SiAdobephotoshop,
  SiAdobeillustrator,
  SiAdobeindesign,
  SiAdobelightroomclassic,
  SiAdobeaftereffects,
  SiAdobepremierepro,
  SiAdobexd,
  SiAdobeacrobatreader,
  SiDavinciresolve
} from 'react-icons/si';

// Data Types
interface Skill {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface ProjectMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  media: ProjectMedia[];
}

// Data
const skills: Skill[] = [
  { name: 'Unreal Engine 5', icon: SiUnrealengine, color: '#0E1128' },
  { name: 'Houdini', icon: SiHoudini, color: '#FF4713' },
  { name: 'Blender', icon: SiBlender, color: '#E87D0D' },
  { name: 'Adobe Suite', icon: SiAdobe, color: '#FF0000' },
  { name: 'Photoshop', icon: SiAdobephotoshop, color: '#31A8FF' },
  { name: 'Illustrator', icon: SiAdobeillustrator, color: '#FF9A00' },
  { name: 'InDesign', icon: SiAdobeindesign, color: '#FF3366' },
  { name: 'Lightroom', icon: SiAdobelightroomclassic, color: '#31A8FF' },
  { name: 'After Effects', icon: SiAdobeaftereffects, color: '#9999FF' },
  { name: 'Premiere Pro', icon: SiAdobepremierepro, color: '#9999FF' },
  { name: 'XD', icon: SiAdobexd, color: '#FF61F6' },
  { name: 'Acrobat', icon: SiAdobeacrobatreader, color: '#FF0000' },
  { name: 'DaVinci Resolve', icon: SiDavinciresolve, color: '#000000' },
];

const projects: Project[] = Array.from({ length: 10 }, (_, i) => ({
  id: `project-${i + 1}`,
  title: `Project ${i + 1}`,
  category: ['Motion Design', '3D Modeling', 'VFX', 'Commercial'][i % 4],
  description: 'Description of the project goes here. This will be replaced by your content.',
  media: [
    { type: 'image', url: 'https://images.unsplash.com/photo-1518155317743-a8ff43ea6a5d?q=80&w=2670&auto=format&fit=crop' },
    { type: 'video', url: '/projects/demo.webm', thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop' }
  ]
}));

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Smooth scroll
  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-purple-500/30">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold tracking-tighter"
          >
            BARON
          </motion.div>

          <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-300">
            {['About', 'Projects', 'Skills', 'Contact'].map((item) => (
              <button
                key={item}
                onClick={() => scrollTo(item.toLowerCase())}
                className="hover:text-white transition-colors"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-20 left-0 w-full bg-slate-950 border-b border-white/10 py-4"
          >
            {['About', 'Projects', 'Skills', 'Contact'].map((item) => (
              <button
                key={item}
                onClick={() => scrollTo(item.toLowerCase())}
                className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {item}
              </button>
            ))}
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.15),rgba(15,23,42,1))]" />

        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-8xl font-bold tracking-tight mb-6"
          >
            Robin Baron
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12"
          >
            Bridging the gap between Virtual Design & Technology.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex justify-center space-x-6"
          >
            <SocialLink href="https://github.com/BaronRobin" icon={<Github />} />
            <SocialLink href="https://www.instagram.com/phtorob" icon={<Instagram />} />
            <SocialLink href="mailto:robinbaron@icloud.com" icon={<Mail />} />
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-500"
        >
          <ChevronDown />
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <SectionHeader title="About Me" subtitle="The journey so far" />

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-slate-300 leading-relaxed">
              <p>
                I'm a passionate creator based in Germany, currently pursuing my Bachelor's degree at <span className="text-white font-medium">Hochschule Kaiserslautern</span>.
              </p>
              <p>
                Alongside my studies, I work at <span className="text-white font-medium">relticc GmbH</span>, where I apply my skills in real-world scenarios. My focus lies in the intersection of technical implementation and artistic expression.
              </p>
              <p>
                I don't just "use" software; I combine tools like Unreal Engine, Houdini, and the Adobe Suite to craft immersive digital experiences.
              </p>
            </div>

            <div className="glass-card p-8">
              <h3 className="text-xl font-semibold mb-6">Current Status</h3>
              <ul className="space-y-4">
                <StatusItem year="2025" title="Bachelor Student" place="Hochschule Kaiserslautern" />
                <StatusItem year="Current" title="Employee" place="relticc GmbH" />
                <StatusItem year="Goal" title="Expanding Horizons" place="Open to new challenges" />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section id="skills" className="py-24">
        <div className="container mx-auto px-6">
          <SectionHeader title="Technical Arsenal" subtitle="Tools I execute with" />

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
            {skills.map((skill, index) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-6 flex flex-col items-center justify-center gap-4 hover:bg-white/10 transition-colors group cursor-default"
              >
                <div className="w-10 h-10 transition-transform group-hover:scale-110" style={{ color: 'white' }}>
                  <skill.icon className="w-full h-full" />
                </div>
                <span className="text-sm font-medium text-slate-300">{skill.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-24 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <SectionHeader title="Selected Works" subtitle="A glimpse into my portfolio" />

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {projects.map((project, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group relative aspect-square overflow-hidden rounded-2xl cursor-pointer"
              >
                <div className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-110">
                  {project.media[0].type === 'video' ? (
                    <video
                      src={project.media[0].url}
                      muted
                      loop
                      playsInline
                      poster={project.media[0].thumbnail}
                      className="object-cover w-full h-full"
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                    />
                  ) : (
                    <img
                      src={project.media[0].url}
                      alt={project.title}
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />

                <div className="absolute bottom-0 left-0 p-8 w-full pointer-events-none">
                  <span className="text-purple-400 text-sm font-medium mb-2 block">{project.category}</span>
                  <h3 className="text-2xl font-bold mb-2">{project.title}</h3>
                  <p className="text-slate-300 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {project.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <a href="https://github.com/BaronRobin" target="_blank" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              View more on GitHub <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24">
        <div className="container mx-auto px-6 text-center">
          <SectionHeader title="Get in Touch" subtitle="Let's create something together" />

          <div className="max-w-xl mx-auto glass-card p-12">
            <p className="text-xl text-slate-300 mb-8">
              Have a project in mind or just want to say hi? I'm always open to discussing new opportunities and ideas.
            </p>
            <a
              href="mailto:robinbaron@icloud.com"
              className="inline-block bg-white text-slate-950 px-8 py-4 rounded-full font-bold hover:bg-slate-200 transition-colors"
            >
              Say Hello
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Robin Baron. All rights reserved.</p>
      </footer>
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle: string;
}

const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => (
  <div className="mb-16 text-center">
    <h2 className="text-3xl md:text-5xl font-bold mb-4">{title}</h2>
    <div className="w-12 h-1 bg-purple-500 mx-auto mb-4" />
    <p className="text-slate-400">{subtitle}</p>
  </div>
);

interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
}

const SocialLink = ({ href, icon }: SocialLinkProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="p-3 bg-white/5 rounded-full hover:bg-white/10 hover:text-purple-400 transition-colors"
  >
    {icon}
  </a>
);

interface StatusItemProps {
  year: string;
  title: string;
  place: string;
}

const StatusItem = ({ year, title, place }: StatusItemProps) => (
  <li className="flex gap-4 items-start">
    <span className="text-purple-400 font-mono text-sm pt-1">{year}</span>
    <div>
      <div className="font-semibold text-white">{title}</div>
      <div className="text-sm text-slate-400">{place}</div>
    </div>
  </li>
);

export default App;
