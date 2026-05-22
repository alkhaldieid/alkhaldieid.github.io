# Eid Alkhaldi Website

Static GitHub Pages portfolio for Eid Alkhaldi, Ph.D.

## Content Workflow

The website is built from:

- `data/profile.json` for the public professional profile.
- `data/post-overrides.json` for polished public titles, tags, and publish controls.
- a local posts directory for draft blog material.

## Review New Blog Posts

Run this after new draft posts are available:

```bash
npm run review:posts
```

This creates a local review file ignored by Git. Review the proposed posts and add or adjust entries in `data/post-overrides.json` for the items approved for the public blog.

Only posts with a curated entry in `data/post-overrides.json` are published. New drafts remain local review items until they have been approved and given a public-safe title, slug, excerpt, tags, and body.

To hold a post back from the public site, add:

```json
{
  "post-slug": {
    "publish": false
  }
}
```

## Publish After Confirmation

After review, publish confirmed posts into the website:

```bash
npm run publish:posts
```

Then commit and push:

```bash
git status
git add .
git commit -m "Refresh portfolio and blog"
git push
```

## Optional Posts Directory

If the post source moves, set a custom directory:

```bash
SIGNAL_POSTS_DIR=/path/to/posts npm run review:posts
SIGNAL_POSTS_DIR=/path/to/posts npm run publish:posts
```
