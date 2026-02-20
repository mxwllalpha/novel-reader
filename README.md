# NovelReader - Astro Clone

A modern novel reader web application clone built with Astro for Cloudflare Pages deployment.

## Features

- 📚 Novel browsing by genre, popularity, and latest updates
- 📖 Clean reading experience with customizable font size and line height
- 🌙 Dark/Light mode toggle
- 🔍 Search functionality
- 📱 Fully responsive design
- ⚡ Static site generation for fast performance

## Tech Stack

- **Framework**: Astro 5.x
- **Styling**: CSS with CSS Custom Properties (variables)
- **Deployment**: Cloudflare Pages (static)

## Project Structure

```
novel-reader/
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── NovelCard.astro
│   ├── data/
│   │   └── novels.ts          # Sample novel data
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro        # Homepage
│   │   ├── latest.astro       # Latest updates
│   │   ├── popular.astro      # Popular novels
│   │   ├── completed.astro    # Completed novels
│   │   ├── search.astro       # Search page
│   │   ├── genre/
│   │   │   └── [genre].astro  # Genre listing
│   │   └── novel/
│   │       ├── [id].astro     # Novel detail
│   │       └── [id]/
│   │           └── [chapter].astro  # Chapter reader
│   └── styles/
│       └── global.css
├── public/
│   └── favicon.svg
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd novel-reader

# Install dependencies
bun install
# or
npm install

# Start development server
bun run dev
# or
npm run dev
```

### Build for Production

```bash
bun run build
# or
npm run build
```

The static files will be generated in the `dist/` directory.

## Deployment to Cloudflare Pages

### Option 1: Direct Upload

1. Build the project locally:
   ```bash
   bun run build
   ```

2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Navigate to Pages > Create a project
4. Select "Direct Upload"
5. Upload the `dist/` folder

### Option 2: Git Integration

1. Push this repository to GitHub/GitLab
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Navigate to Pages > Create a project
4. Select "Connect to Git"
5. Choose your repository
6. Configure build settings:
   - **Build command**: `npm run build` or `bun run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (or your project folder)

### Cloudflare Pages Configuration

Create a `wrangler.toml` file if needed:

```toml
name = "novel-reader"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"
```

## Customization

### Adding More Novels

Edit `src/data/novels.ts` to add more novels:

```typescript
export const novels: Novel[] = [
  {
    id: 'your-novel-id',
    title: 'Your Novel Title',
    author: 'Author Name',
    cover: 'https://example.com/cover.jpg',
    description: 'Novel description...',
    genres: ['Fantasy', 'Action'],
    status: 'Ongoing',
    rating: 4.5,
    views: 100000,
    chapters: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-12-01'
  },
  // ... more novels
];
```

### Styling

Global CSS variables are defined in `src/styles/global.css`:

```css
:root {
  --accent-primary: #6366f1;
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  /* ... more variables */
}
```

## License

This project is for educational purposes. The design is inspired by MangaBooth's NovelReader theme.

## Credits

- Design inspired by [MangaBooth NovelReader](https://live.mangabooth.com/novelreader/)
- Built with [Astro](https://astro.build/)
- Deployed on [Cloudflare Pages](https://pages.cloudflare.com/)
