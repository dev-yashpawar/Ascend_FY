# Campus photographs

These assets are WebP conversions of the three campus photographs supplied for Ascend. Only resizing and compression were applied; architecture, signage, sky and people were not retouched. Original dimensions are preserved in the unsuffixed files. `-768` and `-1280` variants support responsive loading.

- `campus-entrance.webp`: Engineering College Entrance Under Blue Skies (1672 × 941).
- `campus-atrium.webp`: Colorful Atrium Oculus with Bird (1672 × 941).
- `engineering-building.webp`: Modern College Entrance Framed by Greenery (1448 × 1086).

The entrance and atrium originals credit Yash Kardile. Homepage captions retain this attribution even when responsive cropping hides the embedded credit.

To regenerate, install Pillow in your image-processing environment, then run:

```text
python scripts/optimize-campus.py "path/to/source/photos"
```

The `CampusImage` component declares intrinsic dimensions, responsive sources, native lazy loading, and async decoding. The CSS reserves the display area before download. No image libraries or animation dependencies were added to the frontend.
