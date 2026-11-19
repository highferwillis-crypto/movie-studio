# Movie Studio

A project desk for a film. One project holds the library. The stage renders stills and shots against that library. The cut assembles them. The editor talks from the open project’s names and tags.

Open source under the MIT license.

## What it does

- Projects, folders, and your own uploads. Name a file and add comma-separated tags before it is stored.
- Stills in a batch of 1 to 10. Nothing is filed until you keep it.
- Shots with aspect, resolution, and length. Kept shots stack on a reel.
- Absolute is optional. On, a render follows each filed picture by its name and tags. Off, it uses only the line you write.
- Cut: upload or pull from the project, hold a still, trim a video, and play the assembly. Expand fills the screen.
- Comfy Desk, on the front page, edits Flux and Wan graphs and exports a ComfyUI workflow.

Pictures and shots stay in the browser (IndexedDB). Generation calls the xAI API from the server. Set `XAI_API_KEY` in the environment. Do not commit that key.

## Run

```bash
npm install
XAI_API_KEY=your_key npm run dev
```

The studio is at `/studio`. Comfy Desk is at `/`.
