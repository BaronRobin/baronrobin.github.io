export interface ProjectMedia {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
}

export interface Project {
    id: string;
    title: string;
    category: string;
    description: string;
    folderName: string; // Helper for public folder path
    media: ProjectMedia[];
}

export const projects: Project[] = [
    {
        id: '01-polarise',
        title: 'Polarise - AI Hub',
        category: 'Design System',
        description: 'A comprehensive AI hub design system focusing on clarity and utility.',
        folderName: '01_polarise',
        media: [
            { type: 'image', url: '/projects/01_polarise/cover.webp' },
            { type: 'video', url: '/projects/01_polarise/demo.webm' },
        ]
    },
    {
        id: '02-3d-video',
        title: '3D Video',
        category: 'Motion',
        description: 'Experimental 3D video production and motion graphics.',
        folderName: '02_3d_video',
        media: [
            { type: 'video', url: '/projects/02_3d_video/demo.webm' },
            { type: 'image', url: '/projects/02_3d_video/cover.webp' }
        ]
    },
    {
        id: '03-gatti-interviews',
        title: 'Gatti Interviews',
        category: 'Video Production',
        description: 'Interview series editing and color grading.',
        folderName: '03_gatti_interviews',
        media: [{ type: 'image', url: '/projects/03_gatti_interviews/cover.webp' }]
    },
    {
        id: '04-smart-city',
        title: 'Smart City',
        category: '3D Visualization',
        description: 'Urban planning and smart city visualization concepts.',
        folderName: '04_smart_city',
        media: [{ type: 'image', url: '/projects/04_smart_city/cover.webp' }]
    },
    {
        id: '05-dashboard',
        title: 'Dashboard',
        category: 'UI/UX',
        description: 'Data visualization dashboard design for enterprise metrics.',
        folderName: '05_dashboard',
        media: [{ type: 'image', url: '/projects/05_dashboard/cover.webp' }]
    },
    {
        id: '06-houdini',
        title: 'Houdini Explorations',
        category: 'VFX / Simulation',
        description: 'Procedural generation and simulation studies in Houdini.',
        folderName: '06_houdini',
        media: [{ type: 'image', url: '/projects/06_houdini/cover.webp' }]
    },
    {
        id: '07-kitchen-visualisation',
        title: 'Kitchen Visualisation',
        category: 'ArchViz',
        description: 'Photorealistic kitchen rendering and lighting setup.',
        folderName: '07_kitchen_visualisation',
        media: [{ type: 'image', url: '/projects/07_kitchen_visualisation/cover.webp' }]
    },
    {
        id: '08-freisteller',
        title: 'Freisteller Modular DC',
        category: 'Commercial',
        description: 'Modular data center visualization and product showcase.',
        folderName: '08_freisteller',
        media: [{ type: 'image', url: '/projects/08_freisteller/cover.webp' }]
    },
    {
        id: '09-fotogrammetrie',
        title: 'Fotogrammetrie & Gaussians',
        category: 'R&D',
        description: 'Research into photogrammetry and 3D Gaussian Splatting workflows.',
        folderName: '09_fotogrammetrie',
        media: [{ type: 'image', url: '/projects/09_fotogrammetrie/cover.webp' }]
    },
    {
        id: '10-projection-mapping',
        title: 'Projection Mapping',
        category: 'Event Tech',
        description: 'Large scale projection mapping projects and tests.',
        folderName: '10_projection_mapping',
        media: [{ type: 'video', url: '/projects/10_projection_mapping/demo.webm' }]
    }
];
