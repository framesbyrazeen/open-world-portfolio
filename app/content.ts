import {hubLocations} from './landscape.mjs';
export const chapters = [
  {
    id: 'about', number: '01', label: 'The home base', title: 'Hello, I’m Razeen.',
    kicker: 'A CURIOUS MIND FROM KERALA',
    text: 'Computer Science student. Aspiring developer. I like to vibe code—turning a spark of an idea into something I can explore, test, and improve.',
    detail: 'I’m Mohammed Razeen P, from Kozhikode, Kerala. I’m pursuing a B.E. in Computer Science and Engineering at Sri Shanmugha College of Engineering and Technology, Salem, affiliated to Anna University. I expect to graduate in 2027.\n\nI’m looking for opportunities to put what I’m learning into practice—in software and web development, cybersecurity, or software testing.',
    tags: ['Java', 'Python', 'Vibe coding', 'English · Malayalam'],
    ...hubLocations.about, arrival: [hubLocations.about.x, 1, hubLocations.about.z+12], color: '#ef8756',
  },
  {
    id: 'work', number: '02', label: 'The workshop', title: 'Learning by making.',
    kicker: 'HANDS-ON EXPERIENCE',
    text: 'A circuit from scratch. A closer look at cybersecurity. Small, practical steps toward becoming a better builder.',
    detail: 'PCB DESIGN / TATHVA ’24, NIT CALICUT\nDesigned a simple circuit using EasyEDA during a guided, hands-on workshop. Explored circuit design and foundational electronics concepts.\n\nCYBERSECURITY / COLLEGE OF ENGINEERING VADAKARA\nAttended a hands-on workshop on cybersecurity fundamentals and safe computing practices. The certificate is available on LinkedIn.',
    tags: ['EasyEDA', 'PCB design workshop', 'Cybersecurity fundamentals'],
    ...hubLocations.work, arrival: [hubLocations.work.x, 1, hubLocations.work.z+12], color: '#b6cc90',
  },
  {
    id: 'learning', number: '03', label: 'The learning campus', title: 'Always a student.',
    kicker: 'BUILDING THE FOUNDATION',
    text: 'NPTEL · Programming in Java\nElite + Silver certification.',
    detail: 'My coursework includes Theory of Computation, Cloud Computing, and Probability & Statistics. Alongside college, I explore software testing basics and use AI-assisted coding tools to prototype and debug.\n\nI enjoy the point where an abstract idea becomes something I can try for myself. More certifications and workshop credentials are listed on LinkedIn.',
    tags: ['B.E. Computer Science', 'Expected graduation · 2027', 'NPTEL Elite + Silver'],
    ...hubLocations.learning, arrival: [hubLocations.learning.x, 1, hubLocations.learning.z+12], color: '#c1b1d8',
  },
  {
    id: 'creative', number: '04', label: 'The creative garden', title: 'Life beyond the code.',
    kicker: 'A DIFFERENT WAY OF SEEING',
    text: 'Finding a frame worth keeping. Photography and video editing are where I let my curiosity wander.',
    detail: 'I shoot and edit photographs and short videos using mobile tools including CapCut, InShot, VN, and Alight Motion.\n\nThe same curiosity that draws me to technology keeps me experimenting with visual storytelling, composition, and movement.',
    tags: ['Photography', 'Video editing', 'Visual storytelling'],
    ...hubLocations.creative, arrival: [hubLocations.creative.x, 1, hubLocations.creative.z+12], color: '#83baa7',
  },
];
