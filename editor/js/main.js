var PhotoSlot = function(settings) {
    var self = this;
    self.settings = settings;




}

const real_page_width = 350;
const real_page_height = 200;
const real_page_left_margin = 15;
const real_page_right_margin = 10;
const real_page_top_margin = 10;
const real_page_bottom_margin = 10;
const real_inner_page_width = real_page_width - real_page_left_margin - real_page_right_margin
const real_inner_page_height = real_page_height - real_page_top_margin - real_page_bottom_margin
const size_factor = 4;


function real_(measurement) {
    return parseInt(measurement / size_factor, 10)
}

function toggleTab(tab_href) {
    $('#main-card .mdl-tabs__tab-bar a.is-active').toggleClass('is-active', false)
    $('#main-card .mdl-tabs__tab-bar a[href~="#' + tab_href + '"]').toggleClass('is-active', true)

    $('#main-card .mdl-tabs__panel.is-active').toggleClass('is-active', false)
    $('#main-card .mdl-tabs__panel#' + tab_href).toggleClass('is-active', true)

}

function savePage() {
    var page = getComposerConfig()

    $.ajax({
        type: "POST",
        url: 'save-page',
        dataType: 'json',
        data: JSON.stringify(page),
        contentType: "application/json",
        success: function(res) {
            console.log('Page saved')
        }
    })

}

function saveConfig() {

    var config = {
        composer: getComposerConfig(),
        photos: getPhotosConfig(),
        navigator: getNavigatorConfig()
    }

    $.ajax({
        type: "POST",
        url: 'config',
        dataType: 'json',
        data: JSON.stringify(config),
        contentType: "application/json",
        success: function(res) {
            console.log('config saved')
        }
    })



}

function loadConfig() {

    $.get('/config', function(res) {
        var config = JSON.parse(res)
        loadComposerPanel(config.composer)
        loadPhotosPanel(config.photos)
        loadNavigatorPanel(config.navigator)
    })
}

function loadLayoutsPanel() {
    $.get('/layouts', function(res) {
        var reduction_factor = 1.7
        var factor = size_factor * reduction_factor;
        var layouts = JSON.parse(res).layouts;
        layouts.forEach(function(layout) {
            var layout_slots = ""
            layout.slots.forEach(function(slot) {
            var slot_id = slot.id
            var slot_style = 'width:' + slot.width / factor + 'px; height: ' + slot.height / factor + 'px; top: ' + slot.top / factor + 'px; left: ' + slot.left/ factor + 'px"';
                layout_slots += '<div id="' + slot_id + '" class="photo-slot-template" style="' + slot_style + '"/>'
            })
            var layout_padding = [
                real_page_top_margin / reduction_factor,
                real_page_right_margin / reduction_factor,
                real_page_bottom_margin / reduction_factor,
                real_page_left_margin / reduction_factor].join('px ')
            var layout_style = 'padding: ' + layout_padding + 'px; width:' + real_page_width / reduction_factor + 'px; height: ' + real_page_height / reduction_factor + 'px; ';
            var wrapper_style = 'width:' + real_inner_page_width / reduction_factor + 'px; height: ' + real_inner_page_height / reduction_factor + 'px; '
            $("#layouts > .wrapper").append('<div data-layout-name="' + layout.name + '" class="layout-template" style="' + layout_style + '"><div class="wrapper" style="' + wrapper_style + '">' + layout_slots + '</div><i class="fa fa-check-square" aria-hidden="true"></i></div>')
            $("#layouts .layout-template[data-layout-name=" + layout.name+ "]").data('layout', layout)
        })

        $('#layouts .layout-template').on('click', function(event) {
            var $clicked_layout = $(this)
            var is_focused = $clicked_layout.hasClass('focused')
            $('#layouts .layout-template.focused').toggleClass('focused', false)

            if (!is_focused) {
                $(this).toggleClass('focused', true)
            }

        })

        $('#layouts .layout-template i').on('click', function(event) {
            var $clicked_layout = $(this).closest('.layout-template')
            var layout_data = $clicked_layout.data('layout')
            $clicked_layout.removeClass('focused')
            event.stopPropagation()
            removeAllSlots()
            layout_data.slots.forEach(function(slot, index) {
                addSlot(index, slot.width, slot.height, slot.left, slot.top)
                initializePhotoSlot('#' + index)
            })


        })
    })
}

function loadSlotsPanel() {
    $.get('/list-slots', function(res) {
        var slot_categories = JSON.parse(res).slots

        Object.keys(slot_categories).forEach(function(category) {
            var slots = slot_categories[category]
            $("#slots").append('<h6>' + category.toUpperCase() + '</h6>')
            slots.forEach(function(slot) {
                console.log(slot)
                var width = slot[0]
                var height = slot[1]
                $("#slots").append('<div><span class="slot-template" style="width: ' + width + 'px; height: ' + height+ 'px;">' + width + ' x ' + height + '</span></div>')
                $("#slots .slot-template").draggable(
                    {
                        containment: "parent",
                        opacity: 0.7,
                        helper: function(event, ui) {
                            $("#composer .wrapper").append(event.target.outerHTML)
                            var $slot_template = $("#composer .wrapper .slot-template")
                            $slot_template.width($slot_template.width() * size_factor)
                            $slot_template.height($slot_template.height() * size_factor)
                            $slot_template.css("line-height", $slot_template.height() + 'px')
                            $slot_template.css("font-size", parseInt($slot_template.css('font-size'), 10) * (size_factor * 0.5) + 'px')
                            return $slot_template[0]
                        }
                    }
                );
            })
        })
    })
}

function loadComposerPanel(composer) {
    composer.layout.forEach(function(slot) {
        addSlot(slot.id, slot.width, slot.height, slot.left, slot.top)
        initializePhotoSlot('#' + slot.id)
    })
    composer.photos.forEach(function(photo) {
        var $slot = $('.photo-slot#' + photo.slot_id)
        renderPhotoInSlot($slot, photo.src, photo.render)
    })

    $('input#page-name').val(composer.name)

}

function loadPhotosPanel(photos) {
    photos.forEach(function(photo) {
        renderPhotosThumbnail(photo)
    })
}

function loadNavigatorPanel(navigator) {
    navigator.groups.forEach(function(group) {
        loadPhotoFolder(group.path, navigator.selected)
    })

    $.get('/sources', function(res) {
        var $foldersRoot = $('#folders > ul')
        var sources = JSON.parse(res).sources;
        sources.forEach(function(source, index) {
            var subtree = recurseDir(source, 0, undefined, index)
            $foldersRoot.append(subtree)
        })
    })

}

function loadArchivePanel() {
    $.get('/pages', function(res) {
        var pages = JSON.parse(res).pages
        pages.forEach(function(page) {
            $('#archive .wrapper ul').append('<li id="' + page.id + '">' + page.name + '</li>')
            $('#archive .wrapper ul li#' + page.id).data('page', page)
        })
    })

    $('#archive').on('click', '.wrapper ul li', function(event) {
        var $page = $(event.currentTarget)
        var page = $page.data('page')

        clearComposerPanel()
        setTimeout(function() {
            loadComposerPanel(page)
            toggleTab('composer')
        }, 100)


    })
}

function getComposerConfig() {
    var composer = {
        photos: [],
        layout: [],
        name: $('input#page-name').val()
    }
    $("#composer .photo-slot").each(function(index, element) {
        var $slot = $(element);
        var has_photo = $slot.hasClass('has-photo')

        var slot_id = $slot.attr('id')
        var slot_height = $slot.height()
        var slot_width = $slot.width()
        var slot_left = parseInt($slot.css('left'), 10)
        var slot_top = parseInt($slot.css('top'), 10)

        if (has_photo) {

            var $photo = $slot.find('img')
            var original_height = $photo.attr('original_height')
            var original_width = $photo.attr('original_width')

            var current_height = $photo.height()
            var current_width = $photo.width()

            var photo_left_position = parseInt($photo.css('left'), 10)
            var photo_top_position = parseInt($photo.css('top'), 10)

            var screen_left_crop = Math.abs(photo_left_position)
            var screen_top_crop = Math.abs(photo_top_position)
            var screen_right_crop = current_width - slot_width - screen_left_crop
            var screen_bottom_crop = current_height - slot_height - screen_top_crop

            var real_left_crop = (original_width * screen_left_crop) / current_width
            var real_top_crop = (original_height * screen_top_crop) / current_height
            var real_right_crop = (original_width * screen_right_crop) / current_width
            var real_bottom_crop = (original_height * screen_bottom_crop) / current_height

            composer.photos.push({
                src: $photo.attr('src'),
                slot_id: slot_id,
                render: {
                    left: photo_left_position,
                    top: photo_top_position,
                    width: current_width,
                    height: current_height,
                },
                crop: {
                    left: parseInt(real_left_crop, 10),
                    top: parseInt(real_top_crop, 10),
                    right: parseInt(real_right_crop, 10),
                    bottom: parseInt(real_bottom_crop, 10)
                }
            })
        }

        composer.layout.push({
            id: slot_id,
            width: slot_width,
            height: slot_height,
            top: slot_top,
            left: slot_left
        })

    })
    return composer
}


function getPhotosConfig() {
    var photos = []
    $('#photos #photo-list .thumbnail img').each(function(index, element) {
        var $photo = $(element);
        photos.push(
            $photo.attr('src').split('path=')[1]
        )
    })
    return photos
}

function getNavigatorConfig() {
    var config = {
        groups: [],
        selected: []
    }

    $('#navigator #photo-list .thumbnail-group').each(function(index, element) {
        var $group = $(element)
        config.groups.push({
            path: $group.attr('data-path')
        })
    })

    $('#navigator #photo-list .thumbnail-group .thumbnail.favorited').each(function(index, element) {
        var $thumbnail = $(element)
        var $image = $thumbnail.find('img')
        config.selected.push(
            $image.attr('data-img').split('path=')[1]
        )
    })
    return config
}
function fitPhoto($photo, $slot, parameters) {

    var freshImage = parameters === undefined;

    // Take the original width and height from the img element if it's already been set. This way if the photo
    // is zoomed we don't lose this data. Set it
    var original_height = $photo.attr('original_height') === undefined ? $photo.height() : $photo.attr('original_height');
    var original_width = $photo.attr('original_width') === undefined ? $photo.width() : $photo.attr('original_width');

    $photo.attr('original_height', original_height)
    $photo.attr('original_width', original_width)

    var slot_aspect_ratio =  $slot.width() / $slot.height()
    var photo_aspect_ratio = original_width / original_height
    var fit_mode = slot_aspect_ratio >= photo_aspect_ratio ? "width" : "height"

    $photo.attr('fit', fit_mode)

    // When loading a slot's image from config, we already know how to
    // size and position the image, but the first time we need to calculate it
    if (parameters === undefined) {

    }

    console.log(freshImage)


    if (fit_mode == 'height') {
        var height = freshImage ? $slot.height() : parameters.height;
        $photo.height(height)

        var left = freshImage ? -($photo.width() - $slot.width()) / 2 : parameters.left;
        var top = freshImage ? 0 : parameters.top;
        $photo.css('left', left)
        $photo.css('top', top)
    }
    if (fit_mode == 'width') {
        var width = freshImage ? $slot.width() : parameters.width;
        $photo.width(width)

        var top = freshImage ? -($photo.height() - $slot.height()) / 2 : parameters.top;
        var left = freshImage ? 0 : parameters.left;
        $photo.css('left', left)
        $photo.css('top', top)

    }

    return fit_mode
}


function renderPhotoInSlot($slot, imageURL, renderParameters) {
    $slot.addClass('has-photo')
    $slot.find('img').remove();
    $slot.find('.buttons.right').remove();
    $slot.append('\
        <div class="buttons right"> \
        <i class="fa fa-random swap photo-drag"></i> \
        <i class="fa fa-times remove"></i> \
        </div>'
    )
    $slot.append('<img src="' + imageURL+ '"/>')

    var $photo = $slot.find('img')

    $slot.on('click', '.buttons.right i.remove', function(event) {
        var $slot = $(this).closest('.photo-slot')
        var $buttons = $(this).closest('.buttons')
        $photo.remove()
        $slot.toggleClass('has-photo', false)
        $buttons.remove()

    })

    $slot.find('.buttons.right i.swap').draggable({
        helper: function(event, ui) {
            var $wrapper = $(event.currentTarget).closest('.wrapper')
            var $img = $(event.currentTarget).closest('.photo-slot').find('img')
            var aspect_ratio = $img.height() / $img.width()
            var swap_height = 50 * aspect_ratio;
            $wrapper.append('<img class="swap-image" style="width:50px;height:'+ swap_height + 'px;", src="' + $img.attr('src') + '">')
            return $('.swap-image')[0]
        }
    })

    $photo.draggable({
        drag: function(event, ui) {
             // Drag image
                var new_position = fix_margins($photo, $slot, ui.position.left, ui.position.top)
                ui.position.left = new_position.left;
                ui.position.top = new_position.top;
        }
    }
    );
    var intervalID = setInterval(function() {
        if ($photo.width() !==0 && $photo.height() !== 0) {
            // Wait until the photo is fully loaded
            clearInterval(intervalID)

            fitPhoto($photo, $slot, renderParameters)
            makePhotoZoomable($photo, $slot)
        }
    }, 50)
}

function makePhotoZoomable($photo, $slot) {
    $photo.on('mousewheel', function(event) {

        var fit_mode = $photo.attr('fit');
        var new_position;

        if (fit_mode == 'height') {
            var new_height = $photo.height() + event.deltaY;
            if (new_height >= $slot.height()) {
                $photo.height(new_height)
                var new_position = fix_margins($photo, $slot, parseInt($photo.css('left'), 10), parseInt($photo.css('top'), 10))
            }
        }
        if (fit_mode == 'width') {
            var new_width = $photo.width() + event.deltaY;
            if (new_width >= $slot.width()) {
                $photo.width(new_width)
                var new_position = fix_margins($photo, $slot, parseInt($photo.css('left'), 10), parseInt($photo.css('top'), 10))
            }
        }

        if (new_position) {
            $photo.css('left', new_position.left);
            $photo.css('top', new_position.top);
        }
    });
}

function addSlot(slot_id, width, height, left, top) {
    var slot_style = 'width:' + width + 'px; height: ' + height + 'px; top: ' + top + 'px; left: ' + left + 'px"';
    var slot_size = real_(width) + ' x ' +real_(height)
    var slot_buttons ='\
        <div class="buttons left"> \
        <i class="fa fa-arrows move"></i> \
        <i class="fa fa-times remove"></i> \
        </div>'
    $( "#composer .wrapper" ).append('<div id="' + slot_id + '" data-before="' + slot_size + '" class="photo-slot fa" style="' + slot_style + '">'+slot_buttons+'</div>')
}


function loadPhotoFolder(folder, selected) {
    selected = selected === undefined ? [] : selected
    $.get('/list-photos?folder=' + folder.replace('+', '%2B'), function(res) {
        var array = JSON.parse(res)
        var folder_name = folder.split('/').slice(-1)[0]
        var photo_group = '<div class="thumbnail-group" data-path="' + folder + '"><h4>' + folder_name + '<span class="buttons"><i class="fa fa-star-o clear-stars"></i><i class="fa fa-star star-all"></i><i class="fa fa-times remove-group"></i></span></h4>'
        array.photos.forEach(function(image) {
            var favorited = selected.indexOf(image.replace('+', '%2B')) >=0 ? 'favorited' : ''
            photo_group += '<div class="thumbnail darker ' + favorited + '"><img data-img="/get-photo?path=' + image.replace('+', '%2B') + '" src="/get-thumb?path=' + image.replace('+', '%2B') + '""/><i class="fa fa-star-o" aria-hidden="true"></i></div>'
        })
        photo_group += '</div>'
        $("#navigator #photo-list .wrapper").append(photo_group)
    })
}

function clearComposerPanel() {
        $('#composer .wrapper .photo-slot').remove()
        $('input#page-name').val("")
}

function clearNavigatorPhotos(selector) {
    // Selector can be a text selector or a jquery object

    // For each of the starred thumbnails in the navigator
    $(selector).find(' .thumbnail.favorited img').each(function(index, element) {
        var img_src = $(element).attr('src')

        // Remove all the selected thumbnails from the sidebar photos panel
        var $selected_img = $('.photos-card #photo-list .thumbnail img[src="' + img_src + '"]')
        var $selected_thumbnail = $selected_img.closest('.thumbnail')
        $selected_thumbnail.remove()

        // If one of the selected photos is still in the preview, also remove it, and the start
        var image_path = img_src.split('path=')[1]
        var $preview_image = $('#preview img[src*="' + image_path + '"]')
        $preview_image.closest('#preview').remove()
    })
    if ($(selector).hasClass('wrapper')) {
        console.log("remove group")
        $(selector).find('.thumbnail-group').remove()
    } else {
        $(selector).remove()
    }


}

function increase_css(jq_element, property, value) {
    var current_value = parseInt(jq_element.css(property), 10)
    var new_value = current_value + value
    jq_element.css(property, new_value + 'px')
}


function fix_margins(photo, slot, left, top) {
    // if photo is dragged too right or to down, grey areas
    // appear on the left and top. To avoid this, we don't allow positive
    // top and left values NEVER

    var new_top = top;
    var new_left = left;

    if (top > 0) {
        new_top = 0;
    }

    if (left > 0) {
        new_left = 0;
    }

    // if photo is dragged too down or to left, grey areas
    // appear on the right and bottom. To avoid this, we don't allow negative
    // top and left values greater that the overflowed image size

    var overflowed_width = -(photo.width() - slot.width());
    var overflowed_height = -(photo.height() - slot.height());

    if (top < overflowed_height) {
        new_top = overflowed_height;
    }

    if (left < overflowed_width) {
        new_left = overflowed_width;
    }

    return {top: new_top, left: new_left}

}

function removeAllSlots() {
    $("#composer .photo-slot").remove()
}


function initializePhotoSlot(selector) {

    var $slot = $(selector)
    $slot.on('click', '.buttons.left i.remove', function(event) {
        var $slot = $(this).closest('.photo-slot')
        $slot.remove()

    })

    $slot.draggable({
        containment: "parent",
        opacity: 0.7,
        handle: '.buttons.left i.move'
    })

    $slot.resizable({
        resize: function(event, ui) {
            var slot_size = real_(ui.originalElement.width()) + ' x ' +real_(ui.originalElement.height())
            ui.originalElement.attr('data-before', slot_size)
        },
        stop: function(event, ui) {
            var $slot = $(ui.originalElement)
            var $photo = $slot.find('img')
            fitPhoto($photo, $slot)
            //makePhotoZoomable($slot, $photo)
        }
    });


    $slot.droppable({
      accept: ".thumbnail, i.swap",
      classes: {
        "ui-droppable-active": "ui-state-default"
      },
      drop: function( event, ui ) {
        var $slot = $(this)

        if ($(event.toElement).hasClass('swap-image')) {
            var imageURL = event.toElement.attributes["src"].nodeValue;
            var $source_slot = ui.draggable.closest('.photo-slot')
            var $source_img = $source_slot.find('img')
            var $source_buttons = $source_slot.find('.buttons.right')
            $source_img.remove()
            $source_buttons.remove()

        } else {
            var imageURL = event.toElement.attributes["data-img"].nodeValue;
        }

        //console.log(event.toElement.attributes["data-img"].nodeValue)

        renderPhotoInSlot($slot, imageURL)

      }
    });

}

function renderPhotosThumbnail(imagePath) {
    $("#photos #photo-list .wrapper").append('<div class="thumbnail darker"><img data-img="/get-photo?path=' + imagePath.replace('+', '%2B') + '" src="/get-thumb?path=' + imagePath.replace('+', '%2B') + '""/><i class="fa fa-star-o" aria-hidden="true"></i></div')
    $("#photos #photo-list .wrapper .thumbnail").draggable(
        {
            opacity: 0.7,
            helper: "clone",
            appendTo: "body",
        }
    );
}

function renderSelectedPhotos() {

    $("#photos #photo-list .wrapper .thumbnail").remove()
    $("#navigator .thumbnail.favorited").each(function(index, element) {
            var $thumbnail = $(element)
            var $photo = $thumbnail.find('img')
            var imagePath = $photo.attr('src').split('path=')[1]

            renderPhotosThumbnail(imagePath)
    })
}


function recurseDir(source, level, parentFolderID, foldernum) {
    var html = ''
    var hasSubfolder = source.folders.length > 0
    var hasSubfolderClass = hasSubfolder ? 'subfolders': ''
    var parentFolderPrefix = parentFolderID === undefined ? 'folder' : parentFolderID
    var parentFolderID = parentFolderID === undefined ? '' : 'data-parent=' + parentFolderID

    var folderID = parentFolderPrefix + '-' + foldernum
    var folderDataPath = !hasSubfolder ? 'data-path="' + source.path + '"' : ''
    html += '<li ' + parentFolderID +  ' ' + folderDataPath + ' id="' + folderID + '" class="fa ' + hasSubfolderClass + '"><span>' + source.name + '</span></li>'
    if ( hasSubfolder ){
        var subfolders = '<ul class="closed" data-subfolders="' + folderID + '">'
        subfolders += '<li data-path="' + source.path + '" class="fa self"><span>.</span></li>'
        source.folders.forEach(function(folder, index) {
            subfolders += recurseDir(folder, level + 1, folderID, index)
        })
        subfolders += '</ul>'
        html += subfolders
    }
    return html
}



$(document).ready(function () {

    $('#composer')[0].onwheel = function(){return false;}

    loadConfig()
    loadLayoutsPanel()
    loadSlotsPanel()
    loadArchivePanel()

    $('#folders').on('click', 'li', function(event) {
        var $folder = $(event.currentTarget);
        var folderID = $folder.attr('id')
        var folderPath = $folder.attr('data-path')
        var $subfoldersContainer = $('#folders').find('ul[data-subfolders=' + folderID + ']')
        var hasSubfolders = $folder.hasClass('subfolders')
        var isSelfReference = $folder.hasClass('self')


        if (!hasSubfolders || isSelfReference) {
            loadPhotoFolder($folder.attr('data-path'))
        } else if (hasSubfolders) {
            $subfoldersContainer.toggleClass('open')
            $folder.toggleClass('open')

        }
    })

    $('#navigator #photo-list').on('click', '.thumbnail-group i.star-all', function(event) {
        var $button = $(event.currentTarget);
        var $thumbnailGroup = $button.closest('.thumbnail-group')
        $thumbnailGroup.find('.thumbnail').toggleClass('favorited', true)
        renderSelectedPhotos()
    })

    $('#navigator #photo-list').on('click', '.thumbnail-group i.clear-stars', function(event) {
        var $button = $(event.currentTarget);
        var $thumbnailGroup = $button.closest('.thumbnail-group')
        $thumbnailGroup.find('.thumbnail').toggleClass('favorited', false)
        $('#preview').remove()
        renderSelectedPhotos()
    })

    $('#navigator #photo-list').on('click', '.thumbnail-group i.remove-group', function(event) {
        var $button = $(event.currentTarget);
        var $thumbnailGroup = $button.closest('.thumbnail-group')
        clearNavigatorPhotos($thumbnailGroup)
    })


    $( "#composer .wrapper" ).droppable({
      accept: ".slot-template",
      classes: {
        "ui-droppable-active": "ui-state-default"
      },
      drop: function( event, ui ) {
        var next_slot_id = _.max(_.map($('#composer .photo-slot'), function(element) {return parseInt(element.id, 10)})) + 1
        next_slot_id = isNaN(next_slot_id) ? 0 : next_slot_id

        addSlot(
            next_slot_id,
            ui.helper.width(),
            ui.helper.height(),
            parseInt(ui.helper.css('left'), 10),
            parseInt(ui.helper.css('top'), 10)
        )
        initializePhotoSlot('.photo-slot#' + next_slot_id)
      }
    })


    var save_layout_dialog = document.querySelector('dialog#save-layout')
    var $save_layout_dialog = $(save_layout_dialog)
    $("#composer button.save-layout").click(function() {
        save_layout_dialog.showModal()
    })

    $("#composer button.save-config").click(function() {
        saveConfig()
    })

    $("#composer button.save-page").click(function() {
        savePage()
    })

    $("#composer button.clear").click(function() {
        clearComposerPanel()
    })

    $("#composer button.clear-photos").click(function() {
        $('#composer .wrapper .photo-slot img').remove('img, div')
    })


    $save_layout_dialog.find('button.save').click(function() {
        var layout_name = $save_layout_dialog.find('input#layout-name').val()
        var layout = {
            name: layout_name,
            slots: []
        }
        $("#composer .photo-slot").each(function(index, element) {
            var $slot = $(element)
            layout.slots.push({
                id: $slot.attr('id'),
                left: parseInt($slot.css('left'), 10),
                top: parseInt($slot.css('top'), 10),
                height: $slot.height(),
                width: $slot.width()
            })
        })

        $.ajax({
            type: "POST",
            url: 'save-layout',
            dataType: 'json',
            data: JSON.stringify(layout),
            contentType: "application/json",
            success: function(res) {
                console.log('layout saved')
                save_layout_dialog.close()
            }
        })

    })

    $save_layout_dialog.find('button.cancel').click(function() {
        save_layout_dialog.close()
    })



    $("#navigator button.clear").click(function() {
        clearNavigatorPhotos('#navigator #photo-list .wrapper')
    })

    $("#navigator button.select").click(function() {
        $('#navigator #photo-list .thumbnail').toggleClass('favorited', true)
        renderSelectedPhotos()
    })

    $("#navigator button.unselect").click(function() {
        $('#navigator #photo-list .thumbnail').toggleClass('favorited', false)
        renderSelectedPhotos()
    })


    $("#navigator #photo-list").on("click", ".thumbnail", function(event) {
        var $image = $(event.toElement)
        var $thumbnail = $image.closest('.thumbnail')
        var imageURL = event.toElement.attributes["data-img"].nodeValue;
        var is_favorited = $thumbnail.hasClass('favorited')
        var $preview = $('#preview')
        var is_focused = ($thumbnail.hasClass('focused'))

        var $slot = $preview.html('<img src="' + imageURL + '&preview=1"><i class="fa fa-star-o" aria-hidden="true"></i>')
        $preview.toggleClass('favorited', is_favorited)

        var $photo = $("#preview img")
        $("#navigator  #photo-list .thumbnail.focused").toggleClass('focused', false)
        $thumbnail.toggleClass('focused', true)

        if (is_focused) {
            $preview.toggleClass('favorited')
            $thumbnail.toggleClass('favorited')
            renderSelectedPhotos()
        }


        var intervalID = setInterval(function() {
            if ($photo.width() !==0 && $photo.height() !== 0) {

                clearInterval(intervalID)
                var original_width = $photo.width();
                var original_height = $photo.height();

                var slot_aspect_ratio =  $slot.width() / $slot.height()
                var photo_aspect_ratio = original_width / original_height
                var fit_mode = slot_aspect_ratio >= photo_aspect_ratio ? "height" : "width"

                $photo.attr('fit', fit_mode)
                $photo.attr('original_height', original_height)
                $photo.attr('original_width', original_width)

                if (fit_mode == 'height') {
                    $photo.height($slot.height())
                    $photo.css('left', -($photo.width() - $slot.width()) / 2)
                }
                if (fit_mode == 'width') {
                    $photo.width($slot.width())
                    $photo.css('top', -($photo.height() - $slot.height()) / 2)
                }
            }
        })

    })


    $("#navigator #preview").on("click", "i", function(event) {
        var $preview = $(event.toElement).closest('#preview')
        var $photo = $preview.find('img')
        var image_path = $photo.attr('src').split('path=')[1]

        var $image = $(".thumbnail img[src*='" + image_path + "']")
        var $thumbnail = $image.closest('.thumbnail')

        $preview.toggleClass('favorited')
        $thumbnail.toggleClass('favorited')
        renderSelectedPhotos()
    })

});
