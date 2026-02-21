# Where to Add Images for the Website

Place all image files in the **`client/public`** folder. Files in `public` are served from the root URL (e.g. `public/hero.jpg` → `http://localhost:5173/hero.jpg`).

## Image Paths by Page

### Homepage

| Filename          | Use                          | Path in code        |
|-------------------|------------------------------|---------------------|
| `logo.jpeg`      | Navbar & footer logo         | `src="/logo.jpeg"`  |
| `IMG_0132.jpeg`   | Hero section background      | `url("/IMG_0132.jpeg")` |

### Healthcare Professionals Section (on Home page)

| Filename              | Use                                    | Path in code              |
|-----------------------|----------------------------------------|---------------------------|
| `healthcare-hero.jpg` | Hero banner background (dark, blurred) | `url("/healthcare-hero.jpg")` |
| `healthcare-img-1.jpg`| Left image (professionals collaborating) | `src="/healthcare-img-1.jpg"` |
| `healthcare-img-2.jpg`| Center image (workspace / laptop)       | `src="/healthcare-img-2.jpg"` |
| `healthcare-img-3.jpg`| Right image (team collaboration)       | `src="/healthcare-img-3.jpg"` |

### Employer/Candidate Split (Home page)

| Filename                      | Use                        |
|-------------------------------|----------------------------|
| `pexels-cottonbro-5989933.jpg`| Employer panel (Audience split) |
| `start-your-healthcare.png`   | Start Your Healthcare Career section |
| `healthcare-professionals.png`| Right panel (Healthcare Professionals) |

### Testimonial Section (Home page)

| Filename                   | Use                    |
|----------------------------|------------------------|
| `pexels-rdne-6129243.jpg` | Scenic background      |

### What we're thinking (Home page)

| Filename          | Use                      |
|-------------------|--------------------------|
| `blog-preview.jpg`| Team/group photo (right) |

### Jobs Page

No additional images required beyond the shared navbar/footer styling.

---

## Quick Setup

1. Add your image files to **`client/public/`**
2. Use the exact filenames above (case-sensitive)
3. Recommended: JPEG or WebP for photos; keep file sizes reasonable (under 500 KB each for faster loading)

## Fallback

If an image file is missing, the browser will show a broken image or blank space. You can use placeholder images from [placeholder.com](https://placeholder.com) or [unsplash.com](https://unsplash.com) for development.
