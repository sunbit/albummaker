## Album Maker

A Digital album composer to create classical photo print & glue albums.

- Allows you to select, crop & resize photos to be printed as you want
- Allows you to combine several photos into bigger print sizes for special small sizes to save on prints

## Setup

    cd editor
    npm install
    cd ..
    node app.js

    cd scripts
    pipenv install


## Editor Usage

    * Goto `http://localhost:3000`
    * The first time goto composer ->save config to generate a blank config
    * Goto navigator and select photo folders. Fine tune which photos you want with starring all album or individual photos
    * Goto composer, select a layout or add slots manually
    * Drag photos from the photos sidebar to the slots, and resize them as needed
    * You can save current workspace with save_config in the composer
    * If you want to save the current layout as a template, use "save layout"
    * If you want to save the pagem use "save page", a yaml with a description of the page will be saved on data/pages

## Photo print preparation

 Once you have all the pages generated, photos must follow thre processes

### Crop & resize

In this step, all pages yaml configurations are read, anf for each photo, the composer information
is used to exactly crop the selected visible portion of the image, and scale it to the slot size.

Each photo then is saved to data/images/cropper, renamed with some annotations used sed in the next Setup

    `<album-name>-<photo-id-in-album> [<width> x <height>].jpg`

To execute it:

    cd scripts
    pipenv run python crop.py ../data


### Standarize sizes

As some slots may not be of standar sizes, we need to set them to some standards before trying to join
them in the next step

Each photo canvas will be expanded to the next bigger available size found. Also it only takes into
account one size when the same proportions are used, so 10x15 and 15x10 is the same. Program will rotate
to save always the photo in the landscape orientation

Each photo then is saved to data/images/standarized, renamed with some annotations used sed in the next Setup

    `<resized_width>x<resized_height> <album-name>-<photo-id-in-album> [<width> x <height>].jpg`

To execute it:

    cd scripts
    pipenv run python standarize.py ../data

### Join photos

All photos smaller that 10x15 will be joined so it fits in one 10x15 incrementally. The program will start by the smaller
ones, and join them by pairs. Then it will continue with the next size, taking as input all the joined photos from the first
join, plus all the photos that match the current size.

We will end up with a bunch of collage photos of 10x15 containing all the smaller ones

to execute it:

    cd scripts
    pipenv run python joiner.py ../data






