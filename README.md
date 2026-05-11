# The Terminal Strikes Back: Agentic Engineering using the CLI

A talk by Andreas Wänqvist exploring CLI-based agentic coding tools and how to build powerful development workflows in the terminal.

## About This Talk

In 2025, agentic coding tools have moved from the IDE to the command line. This talk covers:

- **Foundational features** for agentic coding workflows
- **Context management strategies** for effective terminal-based development
- **Extensibility options**: models, sub-agents, skills, MCPs, and hooks

Learn how to enhance your terminal experience with advanced agentic engineering techniques and build more efficient development workflows.

## Speaker

### Andreas Wänqvist

- CTO at [Axonis](https://axonis.se)
- Microsoft MVP
- Aurelia Core Team member
- Experience with AI-assisted development and "vibe coding"

### Connect

- Twitter/X: [@mobilemancer](https://twitter.com/mobilemancer)
- Blog & LinkedIn: [mobilemancer.com](https://mobilemancer.com)

## Backend API

The Azure Functions backend for the speaker notes app lives in `backend\SpeakerNotes.Functions`.

### Endpoints

- `GET /api/list-slides` - returns available slide JSON filenames
- `GET /api/get-slide?filename={name}` - returns `{ filename, isValid, slideSet, errors }`

### Local setup

1. Copy `local.settings.sample.json` to `local.settings.json`
2. Configure either `SlideStorage__ConnectionString` or `SlideStorage__ServiceUri`
3. For quick local smoke tests, set `SlideStorage__UseProjectSampleFiles=true`
4. Run `func start`

## Resources

- [Talk on Sessionize](https://sessionize.com/s/AndreasW/the-teminal-strikes-back-agentic-engineering-using/164489)
