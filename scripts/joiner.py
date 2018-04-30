# -*- coding: utf-8 -*-
import os
import sys
from subprocess import check_call
import shlex
import re
from collections import namedtuple, OrderedDict

DPI = 254.0
MONTAGE_BINARY = '/usr/local/bin/montage'

JoinSpecs = namedtuple('JoinSpecs', 'width, height, bucket_size, rotate')

specs_by_size = OrderedDict()

specs_by_size['50x37'] = JoinSpecs(500, 375, 2, True)      # --> 75  x 50
specs_by_size['75x50'] = JoinSpecs(750, 500, 2, True)      # --> 100 x 75
specs_by_size['100x37'] = JoinSpecs(1000, 375, 2, False)   # --> 100 x 75
specs_by_size['100x75'] = JoinSpecs(1000, 750, 2, True)    # --> 150 x 100
specs_by_size['100x50'] = JoinSpecs(1000, 500, 3, True)    # --> 150 x 100
specs_by_size['150x50'] = JoinSpecs(1500, 500, 2, False)   # --> 150 x 100
specs_by_size['200x75'] = JoinSpecs(2000, 750, 2, False)   # --> 200 x 150
specs_by_size['200x50'] = JoinSpecs(2000, 500, 3, True)    # --> 200 x 150


def find_photos_by_size(folder, size):

    def match_file(filename):
        match = re.match(r'(\d+x\d+)_.*[.](?:jpe?g)', filename, re.IGNORECASE)
        return False if match is None else match.groups()[0] == size

    def padded(filename):
        match = re.match(r'(\d+x\d+_)(\d+)(.*)', filename)
        return filename if match is None else '{}{:0>3}{}'.format(*match.groups())

    def realpath(filename):
        path = os.path.realpath(
            os.path.join(folder, filename)
        )
        return path

    matched_files = [realpath(filename) for filename in sorted(filter(match_file, os.listdir(folder)), key=padded)]

    # Sort photos by filename, autopadding the page number

    return matched_files


def delete_photos(filenames):
    for filename in filenames:
        os.remove(filename)


def process_photos(spec, filenames, target_folder):

    # Agrupem les imatges de 2 en dos i guardem cada parella a buckets
    buckets = []
    bucket = []
    for photo in filenames:
        bucket.append(photo)
        if len(bucket) == spec.bucket_size:
            buckets.append(bucket)
            bucket = []

    # Si ha quedat una imatge suelta, la afegim en un bucket sense parella
    if bucket:
        buckets.append(bucket)

    counter = 1
    index = 1

    # Per cada parella de imatges, executem el montage, perque ens uneixi les dues imatges rotades, de manera que tindrem
    # una imatge amb el doble de mida (l'amplada nova sear el doble de l'alçada , en canvi l'alçada sera = que l'anterior amplada).
    # Aquesta imatge tindar el mateix patro de nom de les que surten amb l'script standarize, i per tant es podra utilitzar per ajuntar
    # mes imatges en un pas seguent.

    joined = []
    created = []

    def next_filename(photo_size, spec, index):
        # One of the final photo size components will be doubled, tripled, etc
        # depending on how many photos will be stitched together. Which component gets
        # increased depends if the final photo gets rotated.
        #
        # If rotating, width increases (that i turn its a a factor of original photo height)
        # If not rotating, heigh increases (stacking up photos)
        width_increment_factor = spec.bucket_size if spec.rotate else 1
        height_increment_factor = spec.bucket_size if not spec.rotate else 1

        next_filename = '{width}x{height}_joined_{index:0>3}.jpg'.format(
            width=(photo_size[0] * width_increment_factor) / 10,
            height=(photo_size[1] * height_increment_factor) / 10,
            index=index
        )
        return next_filename

    for bucket in buckets:
        filestojoin = ' '.join(['"%s"' % a for a in bucket])

        # This photo geometry is relative to the photo that will be tiled in the montage part
        # So if we're montaging photos rotated, the geometry will be of the rotate photo so we
        # flip the current photo size components
        photo_size = (spec.width, spec.height)[::(-1 if spec.rotate else 1)]
        photo_geometry = '{}x{}'.format(*photo_size)

        # Make sure the next filename doesn't overwrite a previous file
        # already generated
        while os.path.exists(os.path.join(target_folder, next_filename(photo_size, spec, index))):
            index += 1

        joined_filename = next_filename(photo_size, spec, index)
        target_filename = os.path.join(target_folder, joined_filename)

        cmdline = '{montage} {filenames} {rotation} -geometry {geometry}+0+0 -tile {tiling} "{target_filename}"'.format(
            montage=MONTAGE_BINARY,
            filenames=filestojoin,
            geometry=photo_geometry,
            rotation='-rotate 90' if spec.rotate else '',
            tiling='{}x1'.format(spec.bucket_size) if spec.rotate else '1x{}'.format(spec.bucket_size),
            target_filename=target_filename
        )

        parts = shlex.split(cmdline)

        sys.stdout.write('Joining "{source_photos}" into {joined_photo} ... '.format(
            source_photos='", "'.join(map(lambda f: os.path.split(f)[1], bucket)),
            joined_photo=joined_filename
        ))
        try:
            check_call(parts)
            sys.stdout.write('SUCCESS!\n')
            created.append(target_filename)
        except:
            sys.stdout.write('FAILED!\n')
        sys.stdout.flush()

        joined.extend(bucket)
        counter += 1
        index += 1
    return (joined, created)


def summary(size, joined, created):
    print
    if not joined:
        print 'No {} files to join'.format(size)
    else:
        print 'Joined {} photos into {}'.format(len(joined), len(created))
    print

if __name__ == '__main__':
    path_param = sys.argv[1]
    data_folder = os.path.realpath(path_param)
    standarized_folder = os.path.join(data_folder, 'images', 'standarized')

    for size, specs in specs_by_size.items():
        photos = find_photos_by_size(standarized_folder, size)
        joined, created = process_photos(specs, photos, standarized_folder)
        delete_photos(joined)
        summary(size, joined, created)
