# How I Set Up Emacs to Publish Hugo Posts


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

