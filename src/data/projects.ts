import React from 'react';
import {
    SiAdobeaftereffects,
    SiAdobepremierepro,
    SiAdobephotoshop,
    SiUnrealengine,
    SiBlender,
    SiReact,
    SiDavinciresolve,
    SiHoudini
} from 'react-icons/si';
import { Camera, Mail, Database, Box } from 'lucide-react';

export interface ProjectMedia {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
}

export interface Project {
    id: string;
    title: string;
    category: string;
    link?: string;
    description: string;
    folderName: string; // Helper for public folder path
    media: ProjectMedia[];
    technicals?: {
        icons: React.ComponentType<{ className?: string }>[];
        columns: string[][];
    };
}

export const projects: Project[] = [
    {
        id: '01-polarise',
        title: 'Polarise - AI Hub',
        category: 'Arch Viz',
        description: 'A comprehensive AI hub design system focusing on clarity and utility.',
        folderName: '01_polarise',
        media: [
            { type: 'image', url: '/projects/01_polarise/cover.webp' },
            { type: 'image', url: '/projects/01_polarise/01_Datacenter_Outdoor.jpg' },
            { type: 'video', url: '/projects/01_polarise/Polarise_1.webm' },
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
        id: '02-3d-video',
        title: '3D Video',
        category: 'Launch',
        description: 'Launch video of Company Rebranding.',
        folderName: '02_3d_video',
        media: [
            { type: 'image', url: '/projects/02_3d_video/cover.jpg' },
            { type: 'video', url: '/projects/02_3d_video/Gatti_Lauch_3D_Video_1.webm' },
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
        id: '03-gatti-interviews',
        title: 'Gatti Interviews',
        category: 'Video Production',
        description: 'Interview series editing and color grading.',
        folderName: '03_gatti_interviews',
        media: [
            { type: 'video', url: '/projects/03_gatti_interviews/2025-11-06_Gatti_People_Video_Christof_relticc_Soundtrack_1.webm' },
            { type: 'video', url: '/projects/03_gatti_interviews/2025-11-06_Gatti_People_Video_Team_relticc_Soundtrack_1.webm' },
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
        id: '05-dashboard',
        title: 'Dashboard',
        category: 'UI/UX',
        description: 'Data visualization dashboard design for enterprise metrics.',
        link: 'https://apps.relticc.com/demo',
        folderName: '05_dashboard',
        media: [
            { type: 'video', url: '/projects/05_dashboard/relticc_Experience_Pro_Platform.webm' },
            { type: 'video', url: '/projects/05_dashboard/Timeline_TeamVideo.mp4' },
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
        id: '07-kitchen-visualisation',
        title: 'Kitchen Visualisation',
        category: 'ArchViz',
        description: 'Photorealistic kitchen rendering and lighting setup.',
        folderName: '07_kitchen_visualisation',
        media: [
            { type: 'image', url: '/projects/07_kitchen_visualisation/cover.webp' },
            { type: 'video', url: '/projects/07_kitchen_visualisation/KitchenMakingOf_v3_1.webm' },
            { type: 'video', url: '/projects/07_kitchen_visualisation/relticc_3d_exp_pro_kitchen_1.webm' },
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
        id: '08-freisteller',
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
    }
];
