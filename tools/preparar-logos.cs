using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class LogoPrep
{
    public static void Run(string input, string output, string inverted, bool clearEnclosedLight, int square)
    {
        using (var loaded = new Bitmap(input))
        using (var bmp = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb))
        {
            using (var g = Graphics.FromImage(bmp))
            {
                g.DrawImage(loaded, 0, 0, loaded.Width, loaded.Height);
            }

            int w = bmp.Width;
            int h = bmp.Height;
            var rect = new Rectangle(0, 0, w, h);
            var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = data.Stride;
            var buf = new byte[stride * h];
            Marshal.Copy(data.Scan0, buf, 0, buf.Length);

            var drop = new bool[w * h];
            var queue = new Queue<int>();

            Action<int, int> consider = null;
            consider = (x, y) =>
            {
                if (x < 0 || y < 0 || x >= w || y >= h) return;
                int p = y * w + x;
                if (drop[p]) return;
                int i = y * stride + x * 4;
                if (!IsLight(buf, i)) return;
                drop[p] = true;
                queue.Enqueue(p);
            };

            for (int x = 0; x < w; x++) { consider(x, 0); consider(x, h - 1); }
            for (int y = 0; y < h; y++) { consider(0, y); consider(w - 1, y); }
            while (queue.Count > 0)
            {
                int p = queue.Dequeue();
                int x = p % w;
                int y = p / w;
                consider(x + 1, y);
                consider(x - 1, y);
                consider(x, y + 1);
                consider(x, y - 1);
            }

            if (clearEnclosedLight)
            {
                for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    int i = y * stride + x * 4;
                    if (IsLight(buf, i)) drop[y * w + x] = true;
                }
            }

            for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                int i = y * stride + x * 4;
                if (drop[y * w + x]) buf[i + 3] = 0;
                else buf[i + 3] = 255;
            }

            Marshal.Copy(buf, 0, data.Scan0, buf.Length);
            bmp.UnlockBits(data);

            using (var trimmed = Trim(bmp, 16))
            {
                trimmed.Save(output, ImageFormat.Png);
                using (var light = Invert(trimmed))
                {
                    light.Save(inverted, ImageFormat.Png);
                }
                if (square > 0)
                {
                    using (var icon = FitSquare(trimmed, square, Color.Transparent))
                        icon.Save(System.IO.Path.Combine(System.IO.Path.GetDirectoryName(output), "favicon-32.png"), ImageFormat.Png);
                    using (var apple = FitSquare(trimmed, 180, Color.FromArgb(255, 244, 248, 247)))
                        apple.Save(System.IO.Path.Combine(System.IO.Path.GetDirectoryName(output), "apple-touch-icon.png"), ImageFormat.Png);
                    using (var big = FitSquare(trimmed, 512, Color.FromArgb(255, 244, 248, 247)))
                        big.Save(System.IO.Path.Combine(System.IO.Path.GetDirectoryName(output), "icono-512.png"), ImageFormat.Png);
                }
            }
        }
    }

    static bool IsLight(byte[] buf, int i)
    {
        int b = buf[i];
        int g = buf[i + 1];
        int r = buf[i + 2];
        int max = Math.Max(r, Math.Max(g, b));
        int min = Math.Min(r, Math.Min(g, b));
        int lum = (r * 299 + g * 587 + b * 114) / 1000;
        int sat = max == 0 ? 0 : (max - min) * 255 / max;
        return lum >= 226 && sat < 42;
    }

    static bool IsTeal(Color c)
    {
        return c.G > 90 && c.B > 90 && c.G > c.R + 12 && c.B > c.R + 12;
    }

    static Bitmap Invert(Bitmap src)
    {
        var copy = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
        for (int y = 0; y < src.Height; y++)
        for (int x = 0; x < src.Width; x++)
        {
            var c = src.GetPixel(x, y);
            if (c.A == 0) { copy.SetPixel(x, y, Color.Transparent); continue; }
            if (IsTeal(c)) copy.SetPixel(x, y, Color.FromArgb(c.A, c.R, c.G, c.B));
            else copy.SetPixel(x, y, Color.FromArgb(c.A, 244, 248, 247));
        }
        return copy;
    }

    static Bitmap Trim(Bitmap src, int pad)
    {
        int minX = src.Width, minY = src.Height, maxX = 0, maxY = 0;
        for (int y = 0; y < src.Height; y++)
        for (int x = 0; x < src.Width; x++)
        {
            if (src.GetPixel(x, y).A < 16) continue;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
        if (maxX < minX) return (Bitmap)src.Clone();
        minX = Math.Max(0, minX - pad);
        minY = Math.Max(0, minY - pad);
        maxX = Math.Min(src.Width - 1, maxX + pad);
        maxY = Math.Min(src.Height - 1, maxY + pad);
        var dest = new Bitmap(maxX - minX + 1, maxY - minY + 1, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(dest))
        {
            g.DrawImage(src, new Rectangle(0, 0, dest.Width, dest.Height), new Rectangle(minX, minY, dest.Width, dest.Height), GraphicsUnit.Pixel);
        }
        return dest;
    }

    static Bitmap FitSquare(Bitmap src, int size, Color backdrop)
    {
        var dest = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(dest))
        {
            g.Clear(backdrop);
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.SmoothingMode = SmoothingMode.HighQuality;
            float scale = Math.Min((size * 0.82f) / src.Width, (size * 0.82f) / src.Height);
            int dw = Math.Max(1, (int)(src.Width * scale));
            int dh = Math.Max(1, (int)(src.Height * scale));
            g.DrawImage(src, (size - dw) / 2, (size - dh) / 2, dw, dh);
        }
        return dest;
    }
}
