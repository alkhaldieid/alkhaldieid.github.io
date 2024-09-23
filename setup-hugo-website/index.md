# How I Set Up My Hugo Website


I recently set up my personal website using ****Hugo**** with the ****LoveIt**** theme. Here’s a detailed guide of the steps I took.

****Step 1****: Install Hugo
To install Hugo, I followed the instructions from the official Hugo website:
[Hugo Installation Guide](https://gohugo.io/getting-started/installing/).

```bash
# Install Hugo on Linux using Snap
sudo snap install hugo
```

****Step 2****: Initialize the Hugo Project
After installation, I initialized the Hugo project:

```bash
hugo new site my_website
```

****Step 3****: Add the LoveIt Theme
To add the LoveIt theme, I used Git submodules:

```bash
git submodule add https://github.com/dillonzq/LoveIt.git themes/LoveIt
```

****Step 4****: Configure Hugo
I customized the \`config.toml\` file by updating the site title, base URL, and other settings:

```text
baseURL = "https://alkhaldieid.github.io/"
languageCode = "en-us"
title = "Eid Alkhaldi - AI & Tech Insights"
theme = "LoveIt"
defaultTheme = "dark"
```

****Step 5****: Build and Deploy
Once the configuration was done, I used Hugo to generate the static files:

```bash
hugo
```

Finally, I committed the changes to the \`public/\` folder and pushed the site to GitHub Pages.
My website is now live at: <https://alkhaldieid.github.io/>.

---

