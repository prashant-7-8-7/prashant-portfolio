# Prashant Sharma · AI & ML Portfolio

An animated Prashant greets visitors beside a beige CRT in a 3D room. **Hear greeting** plays the spoken introduction. **Enter workspace** moves the camera to the desk. Click the monitor or choose **Open computer** to run the startup sequence and enter the retro desktop.

## Explore the workspace

| Where | What opens |
| --- | --- |
| My Showcase | About, Experience, Projects, and Contact in the white Showcase window |
| Projects | Research Agents, GridPulse, AI Document Workspace, and RailSetu in desktop windows |
| Start | All desktop apps and the shutdown command |
| Terminal | Type `help`, `ls`, `whoami`, `open projects`, or `open research` |
| Games | Signal Sweeper, Word Guess, Word Tiles, Field Expedition, and Server Room Escape |
| Radio | Two original instrumental tracks with play, pause, and track controls |

Drag a window’s title bar to move it and its bottom-right corner to resize it. **Look around** returns to the desk with the desktop still running. Use **Free camera** and drag to inspect the room. **Shut down** closes the apps and returns to the greeting. **Expand screen** fills the workspace with the desktop. Phones use this view by default. **Pause motion** stops ambient animation and honors the device’s reduced-motion setting.

**Sound on/off** controls the room ambience, fan hum, startup and shutdown chimes, keyboard and mouse effects, and the radio. Browsers may wait for an interaction before allowing sound. **Hear greeting** plays the synthetic narration and its mouth animation on demand. All audio is local to the site.

The address `/#desktop` opens the desktop immediately. Deep links such as `/#projects` and `/#research` open the matching app. Old `/laptop/` and `/rover/` links redirect to the workspace and its Projects window. The same showcase is available at `/portfolio/` for direct reading and for browsers without JavaScript.

## Run locally

Install Node.js 24 LTS, extract the ZIP, and open the `prashant-portfolio` folder in VS Code.

```powershell
npm ci
npm run dev
```

Open the local URL shown in the terminal. For production, use `npm run build`. The output goes to `dist/`, which you can check with `npm run preview`.

## Update an existing repository

Copy the contents of the extracted `prashant-portfolio` folder into your existing repository. Run the commands in that repository to stage the update and remove files retired from previous versions.

```powershell
git rm --ignore-unmatch -- src/experiences.css src/portrait.js src/launcher.js src/rover.js src/rover.css src/rover-audio.js src/rover-map.js src/rover-world.js src/rover-world-data.js src/workspace-scene.js public/experiences/rover.webp
git add index.html laptop rover portfolio src public package.json package-lock.json vite.config.js README.md
git diff --cached --stat
git commit -m "Rebuild the portfolio as a retro CRT desktop"
git push
```

## Make the first commits

Review your bio, project descriptions, and links in `portfolio/index.html` and `src/projects.js`. Create an empty public repository named `prashant-7-8-7.github.io` on GitHub, then run these commands in the extracted project folder.

```powershell
git init -b main
git add .gitignore package.json package-lock.json vite.config.js index.html laptop rover portfolio src public
git commit -m "Build the animated CRT workspace portfolio"
git add README.md .github/workflows/pages.yml
git commit -m "Document setup and configure GitHub Pages"
git remote add origin https://github.com/prashant-7-8-7/prashant-7-8-7.github.io.git
git push -u origin main
```

If Git asks for your identity, run `git config user.name "Prashant Sharma"` and `git config user.email "YOUR_GITHUB_EMAIL_OR_NOREPLY_ADDRESS"` in this repository, then retry the commit.

## Publish to GitHub Pages

1. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the source.
2. Open **Actions → Deploy portfolio → Run workflow** on `main`. If the push already deployed successfully, use that run’s URL.
3. Open the deployment URL shown in the workflow. For the repository above, it is `https://prashant-7-8-7.github.io/`.
4. Connect that URL in your ONEWHO dashboard and create an application named **Unstop**.
5. Submit the resulting `/a/unstop` link and the public repository URL on Unstop.

## Edit the workspace

| File | Contents |
| --- | --- |
| `index.html` and `src/laptop.js` | Greeting, entry, boot, and shutdown |
| `src/room-models.js` and `src/workspace-models.js` | Room, CRT, radio, and animated character models |
| `src/room-scene.js` | Room camera, monitor projection, and animation |
| `src/room.css`, `src/desktop.css`, and `src/showcase.css` | Room controls, desktop interface, and Showcase layout |
| `src/workspace-audio.js` and `public/sound/` | Local narration, radio tracks, and synthesized sound effects |
| `src/desktop-windows.js`, `src/desktop-apps.js`, and `src/desktop-games.js` | Window management, apps, and games |
| `portfolio/index.html` and `src/projects.js` | Showcase content and case studies |
| `src/scene-renderer.js` and `src/workspace-canvas.js` | WebGL 2 and Canvas renderers |

## Credits

- Animated developer and 3D workbench reference. [David Heckhoff](https://david-hckh.com/)
- CRT room, camera movement, startup sequence, desktop, Showcase, and sound interaction references. [Henry Heffernan’s workspace](https://henryheffernan.com/) · [Henry’s desktop](https://os.henryheffernan.com/)
- The scene geometry, audio cues, radio tracks, and games were made for this workspace. The greeting uses a synthetic Flite voice.
- The GridPulse card uses its project dashboard screenshot. [GridPulse source image](https://github.com/prashant-7-8-7/GridPulse/blob/main/docs/assets/dashboard.jpg)
