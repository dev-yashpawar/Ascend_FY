import { emptyPortfolio, type Portfolio } from '../types';
export function demoPortfolios(): Portfolio[] {
  return [
    [
      'KBTUG23513',
      'Aarav Deshmukh',
      'Information Technology',
      'Full Stack Developer · Building for the real world',
      'AD',
      'React',
      'Minimal',
    ],
    [
      'KBTUG23402',
      'Ananya Patil',
      'Computer Engineering',
      'Product Designer · Making everyday things better',
      'AP',
      'Figma',
      'Modern',
    ],
    [
      'KBTUG23617',
      'Rohan Kulkarni',
      'Mechanical Engineering',
      'Mechanical Engineer · From ideas to working prototypes',
      'RK',
      'SolidWorks',
      'Developer',
    ],
  ].map(([id, name, branch, headline, , skill, theme], i) => {
    const p = emptyPortfolio(id, `${id.toLowerCase()}@kbtcoe.org`);
    const now = p.student.createdAt;
    p.student = {
      ...p.student,
      fullName: name,
      branch,
      year: '3rd Year',
      headline,
      about:
        i === 0
          ? 'I’m an Information Technology student who enjoys turning complex problems into simple, useful experiences. Currently exploring full stack development, open source, and products that make a difference on campus.'
          : i === 1
            ? 'I connect thoughtful design with practical engineering. I love researching how people use products and prototyping better ways to solve everyday problems.'
            : 'I’m curious about sustainable engineering and the systems that move our world. I build, test, and iterate on prototypes with a focus on practical impact.',
    };
    p.skills = [
      skill,
      'Problem Solving',
      i === 0 ? 'TypeScript' : i === 1 ? 'User Research' : 'CAD',
      'Teamwork',
    ].map((n, j) => ({ skillId: `demo-${id}-${j}`, collegeId: id, skillName: n, sortOrder: j }));
    p.projects = [
      {
        projectId: `demo-project-${i}`,
        collegeId: id,
        title:
          i === 0
            ? 'Campus Connect'
            : i === 1
              ? 'Wayfinder — Campus navigation'
              : 'Solar-powered water purifier',
        description:
          i === 0
            ? 'A simpler way for students to discover campus events, join communities, and find their people.'
            : i === 1
              ? 'An accessible navigation experience that helps new students feel at home on campus.'
              : 'A low-cost prototype for off-grid water purification, designed with local communities in mind.',
        techStack: [skill, i === 0 ? 'Node.js' : i === 1 ? 'Prototyping' : 'Sustainable Design'],
        githubUrl: '',
        liveUrl: '',
        imageUrl: '',
        verificationStatus: 'self_reported',
        createdAt: now,
        updatedAt: now,
      },
    ];
    p.experiences = [
      {
        experienceId: `demo-exp-${i}`,
        collegeId: id,
        organization: i === 0 ? 'Campus Innovation Lab' : 'Student Innovation Cell',
        role: i === 0 ? 'Student Developer' : 'Project Contributor',
        startDate: '2026-06',
        endDate: '',
        currentlyWorking: true,
        description:
          'Collaborating with a student team to research, prototype, and deliver practical campus solutions.',
        proofUrl: '',
        verificationStatus: 'self_reported',
        createdAt: now,
        updatedAt: now,
      },
    ];
    p.activities = [
      {
        activityId: `demo-act-${i}`,
        collegeId: id,
        category: 'Hackathon',
        title: 'Campus Innovation Sprint',
        organization: 'Student Innovation Cell',
        activityDate: '2026-08-22',
        description:
          'Built and presented a working prototype with an interdisciplinary student team.',
        proofUrl: '',
        verificationStatus: 'self_reported',
        createdAt: now,
        updatedAt: now,
      },
    ];
    p.settings = {
      ...p.settings,
      theme: theme as Portfolio['settings']['theme'],
      accent: i === 1 ? '#16786b' : i === 2 ? '#8554bd' : '#4655d5',
      published: true,
    };
    return p;
  });
}
