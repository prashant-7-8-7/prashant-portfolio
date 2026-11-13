export const projects = {
  research: {
    title: 'Research Agents',
    category: 'Research and claim verification',
    summary: 'A Python research pipeline that turns a question into a cited report and checks individual claims against the source text.',
    details: [
      ['Research pipeline', 'The Planner breaks the topic into questions. The Researcher gathers web sources, the Critic asks for follow-up research when needed, and the Writer produces the report.'],
      ['Claim verification', 'The verifier checks numbers, entities, negation, and direction of change. It combines those checks with repeated local-model judgments and logs claims that need closer inspection.'],
      ['Prototype testing', 'I used planted examples and held-out checks to see whether the verifier could spot unsupported changes. The repository includes the test inputs and documents the cases that still need work.'],
    ],
    tags: ['Python', 'Ollama', 'Streamlit', 'DuckDuckGo search'],
    source: 'https://github.com/prashant-7-8-7/research-agents',
    link: { label: 'Try the verifier example', href: '#verifier' },
  },
  gridpulse: {
    title: 'GridPulse',
    category: 'Applied machine learning',
    summary: 'A microgrid dashboard that turns hourly weather records into electricity-demand forecasts and dispatch decisions.',
    details: [
      ['Forecasting', 'GridPulse validates a 24-hour weather input, builds the same numerical features used during training, and sends them to the published Zoho Catalyst QuickML regression endpoint.'],
      ['Dispatch', 'The dashboard shows which hours use renewable storage, which use the main grid, and when the demand forecast triggers an overload alert.'],
      ['Verification', 'The repository records a sample run with 24 forecast values and compares all 24 dispatch and overload decisions with the challenge rules.'],
    ],
    tags: ['Python', 'scikit-learn', 'Zoho QuickML', 'Catalyst AppSail'],
    source: 'https://github.com/prashant-7-8-7/GridPulse',
    link: { label: 'View verification record', href: 'https://github.com/prashant-7-8-7/GridPulse/blob/main/docs/LIVE_VERIFICATION.json' },
  },
  workspace: {
    title: 'AI Document Workspace',
    category: 'Retrieval and study tools',
    summary: 'A document study workspace with source-linked answers, a document viewer, and quiz generation.',
    details: [
      ['Ingestion and retrieval', 'The workspace extracts text from uploaded files, splits it into chunks, and retrieves relevant passages with a combination of semantic and keyword search.'],
      ['Study workflow', 'A student can open the source document alongside the chat, inspect the passages behind an answer, and generate practice questions from the document.'],
      ['Application stack', 'FastAPI handles ingestion and chat. SQLite stores workspace data, and a JavaScript interface presents document chunks, streamed answers, and quizzes.'],
    ],
    tags: ['FastAPI', 'SQLite', 'Sentence Transformers', 'JavaScript'],
    source: 'https://github.com/prashant-7-8-7/Macro-Project-',
  },
  railsetu: {
    title: 'RailSetu',
    category: 'Railway operations · Team project',
    summary: 'A team-built prototype for planning railway maintenance blocks and reporting issues from the field.',
    details: [
      ['Field reporting', 'The Flutter app collects an issue category and severity, a description, location data, and an optional photo for review.'],
      ['My contribution', 'I worked on testing and debugging the reporting flow between the Flutter app and FastAPI, including location permissions and photo uploads.'],
      ['Integration', 'Testing JSON reports and multipart reports separately helped isolate the request validation issues in the upload path.'],
    ],
    tags: ['Flutter', 'Dart', 'FastAPI', 'REST'],
    source: 'https://github.com/ssh-gaurav/RailSetu',
  },
};

const dispatchEvidence = 'GridPulse selects Renewable Storage Mode when forecast demand exceeds 160 kW or the hour is 18:00–22:00.';

export const claimExamples = {
  dispatch: {
    claim: 'At 17:00, a forecast of 175 kW triggers Renewable Storage Mode.',
    evidence: dispatchEvidence,
    kind: 'supported',
    verdict: 'Supported',
    reason: '175 kW exceeds the 160 kW threshold, so the demand rule applies at 17:00.',
  },
  overload: {
    claim: 'A forecast of 205 kW stays below the critical overload threshold.',
    evidence: 'GridPulse raises a critical overload alert when forecast demand reaches 200 kW or more.',
    kind: 'contradicted',
    verdict: 'Contradicted',
    reason: '205 kW is above the 200 kW threshold, so the forecast triggers an alert.',
  },
  savings: {
    claim: 'Renewable Storage Mode cuts peak demand by 15%.',
    evidence: dispatchEvidence,
    kind: 'insufficient',
    verdict: 'Insufficient evidence',
    reason: 'The rule specifies when to select a mode. It provides no measurement of peak-demand savings.',
  },
};
