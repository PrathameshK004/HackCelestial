import math
from PIL import Image, ImageDraw

def render_minimal_flight_gif():
    """
    Renders an ultra-clean, Apple/Airbnb-level minimal travel animation GIF.
    - Rendered at 2x super-sampling for pristine Retina smoothness.
    - Cream canvas matching #FAF8F5 exactly.
    - Minimalist flight trajectory from left city to right destination.
    - Sleek golden airplane silhouette with smooth heading and soft contrail.
    - Clean destination radar pulse.
    """
    # High-res dimensions
    scale = 2
    W, H = 380 * scale, 140 * scale
    out_w, out_h = 380, 140
    num_frames = 48

    BG_COLOR = (250, 248, 245) # #FAF8F5
    OLIVE = (46, 51, 27)        # #2E331B luxury deep olive
    GOLD = (212, 175, 55)       # #D4AF37 champagne gold
    GOLD_LIGHT = (235, 204, 106)
    TRACK_COLOR = (200, 192, 175)

    def get_pos(prog):
        # Elegant shallow arc from left (x=50) to right (x=W-50)
        x = 55 * scale + prog * (W - 110 * scale)
        # Gentle parabolic curve peaking in middle
        y = (H * 0.72) - math.sin(prog * math.pi) * (45 * scale)
        return x, y

    frames = []

    for f in range(num_frames):
        t = f / num_frames
        im = Image.new("RGBA", (W, H), (*BG_COLOR, 255))
        draw = ImageDraw.Draw(im, "RGBA")

        # 1. Subtle horizontal base axis or track
        base_y = int(H * 0.76)
        # draw subtle dotted geodesic curve
        steps = 90
        for s in range(steps):
            prog_s = s / steps
            px, py = get_pos(prog_s)
            # Dashes
            if s % 4 < 2:
                r = 1.8 * scale
                draw.ellipse([px - r, py - r, px + r, py + r], fill=(*TRACK_COLOR, 130))

        # 2. Origin point (Left)
        ox, oy = get_pos(0)
        draw.ellipse([ox - 4 * scale, oy - 4 * scale, ox + 4 * scale, oy + 4 * scale], fill=(*OLIVE, 220))
        draw.ellipse([ox - 2 * scale, oy - 2 * scale, ox + 2 * scale, oy + 2 * scale], fill=(*BG_COLOR, 255))

        # 3. Destination point (Right) with pulsing radar wave
        dx, dy = get_pos(1.0)
        pulse_phase = (t * 2.0) % 1.0
        pulse_r = (4 + pulse_phase * 12) * scale
        pulse_alpha = int(180 * (1.0 - pulse_phase))
        draw.ellipse([dx - pulse_r, dy - pulse_r, dx + pulse_r, dy + pulse_r],
                     outline=(*GOLD, pulse_alpha), width=max(1, int(1.5 * scale)))
        draw.ellipse([dx - 5 * scale, dy - 5 * scale, dx + 5 * scale, dy + 5 * scale], fill=(*GOLD, 255))
        draw.ellipse([dx - 2.5 * scale, dy - 2.5 * scale, dx + 2.5 * scale, dy + 2.5 * scale], fill=(*BG_COLOR, 255))

        # 4. Plane trajectory position
        plane_t = t
        px, py = get_pos(plane_t)

        # Calculate tangent heading angle
        dt = 0.01
        nx, ny = get_pos(min(1.0, plane_t + dt))
        angle = math.atan2(ny - py, nx - px)
        cos_a, sin_a = math.cos(angle), math.sin(angle)

        # 5. Soft golden contrail (wake)
        trail_len = 16
        for tp in range(1, trail_len):
            trail_t = plane_t - (tp * 0.016)
            if trail_t >= 0:
                tx, ty = get_pos(trail_t)
                fade = (1.0 - (tp / trail_len))
                tw = (3.5 * fade) * scale
                draw.ellipse([tx - tw, ty - tw * 0.6, tx + tw, ty + tw * 0.6],
                             fill=(*GOLD_LIGHT, int(150 * fade)))

        # 6. Sleek Minimal Plane Silhouette
        def rot(lx, ly):
            return (px + (lx * cos_a - ly * sin_a) * scale,
                    py + (lx * sin_a + ly * cos_a) * scale)

        # Fuselage
        fuse_pts = [
            rot(13, 0),
            rot(8, -2.2),
            rot(-9, -2.4),
            rot(-12, -0.5),
            rot(-13, 0),
            rot(-12, 0.5),
            rot(-9, 2.4),
            rot(8, 2.2)
        ]
        draw.polygon(fuse_pts, fill=(*OLIVE, 255))

        # Swept Wings
        wing_pts = [
            rot(3, 0),
            rot(-5, -14),
            rot(-9, -13.5),
            rot(-4, 0),
            rot(-9, 13.5),
            rot(-5, 14),
        ]
        draw.polygon(wing_pts, fill=(*OLIVE, 255))
        draw.line(wing_pts + [wing_pts[0]], fill=(*GOLD, 255), width=max(1, int(1 * scale)))

        # Tail Fin
        tail_pts = [
            rot(-8, 0),
            rot(-13, -6.5),
            rot(-14.5, -6),
            rot(-11.5, 0),
        ]
        draw.polygon(tail_pts, fill=(*GOLD, 255))

        # Golden nose tip
        draw.polygon([rot(13, 0), rot(8, -1.5), rot(8, 1.5)], fill=(*GOLD_LIGHT, 255))

        # Downsample with Lanczos for smooth Retina antialiasing
        im_down = im.resize((out_w, out_h), Image.Resampling.LANCZOS)
        frames.append(im_down)

    out_path = "/Users/yogesh/Desktop/HackCelestial/MobileApp/assets/travel-motion.gif"
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=36,
        loop=0,
        optimize=True
    )
    frames[0].convert("RGB").save("/Users/yogesh/Desktop/HackCelestial/MobileApp/assets/travel_preview.png")
    print("Minimal flight GIF successfully generated at", out_path)

render_minimal_flight_gif()
