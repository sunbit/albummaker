# -*- coding: utf-8 -*-
import os
from PIL import Image
from PIL import ImageDraw
import sys

FORMATS = ['jpg', 'jpeg']    # Formats acceptats
JPEG_QUALITY = 100          # Qualitat de les imatges retallades
DPI = 254.0                 # Resolució de treball en dots-per-inch
SIZES = [
    (37.5, 25),
    (50.0, 37.5),       # Mides standard en mm a les que s'ajustaran les imatges
    (75.0, 50.0),
    (100.0, 37.5),
    (100.0, 50.0),
    (100.0, 75.0),
    (150.0, 50.0),
    (150.0, 100.0),
    (200.0, 50.0),
    (200.0, 75.0),
    (200.0, 150.0),
    (250.0, 200.0),
]
DEBUG = False


def landscapize(image):
    """
    Coloca totes les imatges en apaisat (cantó mes llarg en horitzontal),
    per simplificar l'algorisme d'escollir mida standard
    """
    if image.size[1] > image.size[0]:
        return image.rotate(90, expand=True)
    else:
        return image


def chooseStandarSize(w, h):
    """
    Escull una mida de la llista de mides estadard, que sigui igual o més gran que les mides
    indicades, si no troba una mida prou gran, retorna False.
    """
    si = 0
    while w > SIZES[si][0] or h > SIZES[si][1]:
        # si l'amplada o l'alcada son > que la mida que estem mirant
        si += 1
    if si < len(SIZES):
        return SIZES[si]
    else:
        return False


def Pixel2MM(w, h):
    """
    Calcula ample i alt en mm, segons mides en pixels
    Fa la conversio de polzades a mm
    """
    return ((w / DPI) * 25.4, (h / DPI) * 25.4)


def MM2Pixel(w, h):
    """
    Calcula ample i alt en pixels, segons mides en milímetres
    Fa la conversio de polzades a mm
    """
    return (int((w / 25.4) * DPI), int((h / 25.40) * DPI))


if __name__ == '__main__':
    path_param = sys.argv[1]
    data_folder = os.path.realpath(path_param)
    pages_folder = os.path.join(data_folder, 'pages')
    cropped_folder = os.path.join(data_folder, 'images', 'cropped')
    standarized_folder = os.path.join(data_folder, 'images', 'standarized')

    files = [f for f in os.listdir(cropped_folder) if f.lower().split('.')[-1] in FORMATS and 'PR_' not in f]

    counters = dict([(a, 0) for a in SIZES])

    for filename in files:
        # Obrim la imatge, "l'apaisem" ,
        # calculem la mida en mm segons la resolució
        # i busquem una mida standard que la pugui contenir
        original = Image.open(os.path.join(cropped_folder, filename))
        image = landscapize(original)
        pixelwidth, pixelheight = image.size
        mmwidth, mmheight = Pixel2MM(pixelwidth, pixelheight)
        newmmsize = chooseStandarSize(mmwidth, mmheight)
        if mmwidth != newmmsize[0] or mmheight != newmmsize[1]:
            if DEBUG:
                text = ' * Estandaritzant "%s" de %dx%d a %dx%d' % (filename, mmwidth, mmheight, newmmsize[0], newmmsize[1])
                text = '%-55s . . . ' % text
            else:
                text = '+'
        else:
            if DEBUG:
                text = ' * Already standard size in "{}"'.format(filename)
            else:
                text = '.'

        sys.stdout.write(text)
        sys.stdout.flush()

        # Augmentem el comptador de fotos de la mida escollida
        counters[newmmsize] += 1

        # Instanciem una nova imatge amb fons blanc, amb les mides standard triades
        newimage = Image.new(image.mode, MM2Pixel(newmmsize[0], newmmsize[1]), (255, 255, 255))

        # Dibuixem un rectangle blanc que separi la imatge del fons
        # dnewimage = ImageDraw.Draw(newimage)
        # dnewimage.rectangle((0,0,pixelwidth,pixelheight))

        # Copiem tota la imatge original i l'enganxem a la imatge nova que hem creat
        # En acavat, guardem la imatge a la qualitat i resolucions definides
        region = image.crop((0, 0, pixelwidth, pixelheight))
        newimage.paste(region, (0, 0, pixelwidth, pixelheight))

        new_filename = '%dx%d_%s' % (newmmsize[0], newmmsize[1], filename)
        new_filename = os.path.join(standarized_folder, new_filename)
        newimage.save(new_filename, quality=JPEG_QUALITY, dpi=(int(DPI), int(DPI)))
        if DEBUG:
            sys.stdout.write('FET!\n')
            sys.stdout.flush()

    # Mostrar el recompte final de imatges de cada mida
    print
    for size in SIZES:
        print '[%dx%d] = %d' % (size[0], size[1], counters[size])
