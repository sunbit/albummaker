# -*- coding: utf-8 -*-
import sys
import os
import yaml
import glob
from PIL import Image
from urllib.parse import unquote

DPI = 254                           # Resolució de sortida en dots-per-inch
JPEG_QUALITY = 100                  # Qualitat de les imatges retallades
SCALE_FACTOR = 4


def crop(photo, crop_settings):
    photo_width, photo_height = photo.size
    crop_box = (
        crop_settings['left'],
        crop_settings['top'],
        photo_width - crop_settings['right'],
        photo_height - crop_settings['bottom']
    )
    return photo.crop(crop_box)


def resample(photo, size, dpi):
    """
        Resize and resample photo based on the desired size and DPI.

        As size are represented in mm, we use formula 1 inch = 25.4 mm
    """
    scaled_size = (
        int((size[0] / 25.4) * dpi),
        int((size[1] / 25.4) * dpi),
    )
    resized = photo.resize(scaled_size, Image.ANTIALIAS)
    resized.load()
    return resized


def get_slot(pages, slot_id):
    return [slot for slot in pages['layout'] if slot['id'] == slot_id][0]


def calc_slot_real_size(slot, scale):
    size = [slot['width'] / scale, slot['height'] / scale]
    if size[0] == 38:
        size[0] = 37.5
    if size[1] == 38:
        size[1] = 37.5
    return tuple(size)

if __name__ == '__main__':
    path_param = sys.argv[1]
    data_folder = os.path.realpath(path_param)
    pages_folder = os.path.join(data_folder, 'pages')
    cropped_folder = os.path.join(data_folder, 'images', 'cropped')

    for page_filename in map(os.path.realpath, glob.glob('{}/*.yaml'.format(pages_folder))):
        page = yaml.load(open(page_filename).read())
        for photo in page['photos']:
            if 'src' not in photo:
                print('ERROR Processing page {} slot {}'.format(page['name'], photo['slot_id']))
                continue

            photo_path = unquote(photo['src'].split('path=')[1])

            slot = get_slot(page, photo['slot_id'])
            slot_real_size = calc_slot_real_size(slot, scale=SCALE_FACTOR)

            new_filename = '{page}-{slot} [{width} x {height}].jpg'.format(
                page=page['name'],
                slot=photo['slot_id'],
                width=slot_real_size[0],
                height=slot_real_size[1],
            )
            new_filename = os.path.join(cropped_folder, new_filename)

            if not os.path.exists(new_filename):
                print('Processing ', new_filename)
                original = Image.open(photo_path)
                cropped = crop(original, photo['crop'])
                resampled = resample(cropped, size=slot_real_size, dpi=DPI)
                resampled.save(new_filename, quality=JPEG_QUALITY, dpi=(DPI, DPI))

