# 


## From Frustration to Automation: A Journey in Reporting Efficiency {#reporting-efficiency-automation}

🚀 From Frustration to Automation: A Journey in Reporting Efficiency

As Deputy Site Manager, I had to submit daily progress reports to governmental agencies, which consisted mostly of images. Initially, I used MS Word, but aligning images manually was frustrating and took over an hour every day. It wasn’t efficient and prevented me from focusing on more strategic tasks.

Being a fan of automating repetitive work, I turned to ****LaTeX**** and ****Python****. Using LaTeX helped streamline the formatting, but I realized the reports followed a repetitive structure. With some encouragement from my colleague Ali Alzahrani, I decided to automate the entire process.

I spent a few hours coding and iteratively refining a tool. The result? What used to take an hour now takes less than 5 seconds. The tool automatically pulls images, generates LaTeX code, and compiles a perfectly formatted PDF report, ready to submit.

This journey taught me the power of coding to solve real-world problems and optimize workflows. If you're facing similar challenges, feel free to check out the tool I built. It’s available for free on my GitHub: <https://lnkd.in/dQCqZbC8>. I hope it helps others save time and focus on what truly matters.

🚀 من الإحباط إلى الأتمتة: رحلة في كفاءة إعداد التقارير

بصفتي نائب مدير الموقع، كنت مسؤولًا عن إعداد تقارير يومية للجهات الحكومية توثق العمل المنجز، وكانت هذه التقارير تعتمد بشكل كبير على الصور. في البداية، اعتمدت على MS Word، لكن تنسيق الصور يدويًا كان مرهقًا ويستغرق أكثر من ساعة يوميًا.

قررت الاستفادة من خبرتي في LaTeX وPython لأتمتة العملية بالكامل. باستخدام LaTeX، تمكنت من تبسيط التنسيق، لكن العملية كانت مكررة يوميًا. بدعم من زميلي علي الزهراني، برمجت أداة تقوم بكل شيء تلقائيًا.

النتيجة؟ التقارير التي كانت تستغرق ساعة تُنجز الآن في أقل من 5 ثوانٍ. الأداة ترتب الصور، تولد كود LaTeX، وتنتج تقريرًا PDF جاهزًا للإرسال.

إذا كنت تواجه تحديات مماثلة، اكتشف الأداة مجانًا على GitHub: <https://lnkd.in/dQCqZbC8>.

****Hashtags****:
\#Python #Automation #LaTeX #Efficiency #DigitalTransformation #ProjectManagement #أتمتة #Python #LaTeX #إنتاجية #إدارة_المشاريع #تحول_رقمي


## How I Set Up My Hugo Website {#setup-hugo-website}

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


## How I Set Up Emacs to Publish Hugo Posts {#setup-emacs-hugo}

I prefer writing blog posts in ****Org mode**** and exporting them to Markdown using ****ox-hugo**** in Emacs. Here’s how I set it up.

****Step 1****: Install \`ox-hugo\`
First, I installed the \`ox-hugo\` package in Emacs:

```emacs-lisp
(use-package ox-hugo
  :ensure t
  :after ox)
```

****Step 2****: Writing Posts in Org Mode
I write posts in Org mode with headings and metadata. Here’s an example template I use for my posts:

\#+begin_example org


## Post Title {#my-post-title}

This is the content of the post written in ****Org mode****.
\#+end_example

****Step 3****: Exporting to Markdown
After writing the post, I export it to Markdown using the following command in Emacs:

```bash
M-x org-hugo-export-wim-to-md
```

****Step 4****: Live Preview with Hugo
To preview the site locally, I run \`hugo server\` directly from Emacs:

```emacs-lisp
(defun hugo-server ()
  (interactive)
  (async-shell-command "hugo server -D"))
```

This setup allows me to seamlessly publish blog posts written in Org mode to my Hugo-powered website.

---

