# The terminal strikes back

## Two Modes

 Programatic mode
 Interactive mode

 copilot -p "list my open PRs"

## Essential commands

 Handy commands (interactive mode)

 /update - the CLI updates often (only for certain installers)
 /models
 /ide

## Modes

 "Normal"
 Plan
 Autopilot[Paste #1 - 35 lines]

## Config, Admissions etc

 /yolo
 --yol

 Visa config (~/.copilot/config.json)

## Sessions

 /session
 Selecting from older sessions
 Copilot --resume
 Continue previous session
 Copilot --continue
 /share

## Context Management

 /context

 /env

## Workspace

 /add-dir

 /ide - see diffs in code :)

## Agents

 /fleet

 Rubberduck - when using Anthropic models, reviews w gpt5.4

## Extending with Plugins

   Show adding a marketplace and plugin

   /plugin marketplace list
   /plugin marketplace add anthropics/claude-code
   /plugin marketplace browse awesome-copilot
   /plugin install technical-spike@awesome-copilot
   /create-technical-spike

## LSP

   All LSPs need to be installed, different lsp are installed in different ways, for ex the TS lsp
   npm install -g typescript-language-server
   Then tell Copilot cli to install typescript lsp in .github/lsp.json
   Restart cli - /restart
   /lsp show
   To test if it started correctly
   /lsp test typescript
   PS. 2 versions of config, one in project .github/lsp.json and one in ~

## Sessions – When finishing up

   /chronicle standup
   /chronicle tips

   /remote + /keep-alive

## The End

   Thank you 💜

   Contact me on LinkedIn if you have questions
