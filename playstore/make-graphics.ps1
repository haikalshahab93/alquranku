# Membuat feature graphic 1024x500 + ikon 512x512 untuk Play Store
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$iconSrc = Join-Path $root "..\assets\icon.png"
$outFeat = Join-Path $root "feature-graphic.png"
$outIcon = Join-Path $root "icon-512.png"

# ============ 1. FEATURE GRAPHIC 1024x500 ============
$w = 1024; $h = 500
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'

# Latar gradient ungu diagonal
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$c1 = [System.Drawing.Color]::FromArgb(255, 124, 58, 237)   # #7C3AED
$c2 = [System.Drawing.Color]::FromArgb(255, 167, 139, 250)  # #A78BFA
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 35)
$g.FillRectangle($brush, $rect)

# Ikon aplikasi di kanan (dengan sudut membulat via clipping)
$iconSize = 300
$iconX = $w - $iconSize - 70
$iconY = [int](($h - $iconSize) / 2)
$src = [System.Drawing.Image]::FromFile($iconSrc)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 60
$path.AddArc($iconX, $iconY, 2*$r, 2*$r, 180, 90)
$path.AddArc($iconX+$iconSize-2*$r, $iconY, 2*$r, 2*$r, 270, 90)
$path.AddArc($iconX+$iconSize-2*$r, $iconY+$iconSize-2*$r, 2*$r, 2*$r, 0, 90)
$path.AddArc($iconX, $iconY+$iconSize-2*$r, 2*$r, 2*$r, 90, 90)
$path.CloseFigure()
$g.SetClip($path)
$g.DrawImage($src, $iconX, $iconY, $iconSize, $iconSize)
$g.ResetClip()

# Teks kiri: nama app + tagline
$white = [System.Drawing.Brushes]::White
$fontTitle = New-Object System.Drawing.Font('Segoe UI', 64, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font('Segoe UI', 22)
$fontSub2 = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Italic)
$fmt = New-Object System.Drawing.StringFormat
$g.DrawString("ALQURANKU", $fontTitle, $white, 60, 150)
$g.DrawString("Baca Al-Qur'an dengan nyaman", $fontSub, $white, 64, 260)
$g.DrawString("Terjemahan, Tafsir, Audio, Doa, Hadits & Jadwal Sholat", $fontSub2, $white, 64, 300)

$bmp.Save($outFeat, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $src.Dispose()
Write-Host "Feature graphic: $outFeat"

# ============ 2. IKON 512x512 ============
$src2 = [System.Drawing.Image]::FromFile($iconSrc)  # reload (yang lama sudah di-Dispose)
$outBmp = New-Object System.Drawing.Bitmap(512, 512)
$og = [System.Drawing.Graphics]::FromImage($outBmp)
$og.InterpolationMode = 'HighQualityBicubic'
$og.SmoothingMode = 'AntiAlias'
$og.DrawImage($src2, 0, 0, 512, 512)
$og.Dispose()
$outBmp.Save($outIcon, [System.Drawing.Imaging.ImageFormat]::Png)
$outBmp.Dispose()
$src2.Dispose()
Write-Host "Ikon 512: $outIcon"
