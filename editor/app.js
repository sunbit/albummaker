var express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp')
const yaml = require('js-yaml');
const http = require('http');
var slugify = require('slugify')

function dirname(pth) {
    return path.join(__dirname + pth)
}


const app = express();
const server = http.createServer(app)

app.use(bodyParser.json())


app.get('/', function (req, res) {
  res.sendFile(dirname('/index.html'))
});


const photoSources = [
    "/Volumes/DATA/Fotografia/Albums",
    "/Volumes/DATA/Fotografia/Panoràmiques",
    "/Users/sunbit/Dropbox"
]


function recurseDir(folderPath) {
    var dir_name = folderPath.split('/').slice(-1)[0]
    var dir_data = {'name': dir_name, folders: [], path: folderPath}
    fs.readdirSync(folderPath).forEach(filename => {
        var subfolderPath = [folderPath, filename].join('/')
        if (fs.lstatSync(subfolderPath).isDirectory()) {
            dir_data.folders.push(recurseDir(subfolderPath))
        }
    })
    return dir_data
}


app.get('/sources', function (req, res) {
    var tree = {'sources': []}
    photoSources.forEach(function(source) {
        var source_data = recurseDir(source)
        tree.sources.push(source_data)
    })
    res.send(JSON.stringify(tree))

})

app.get('/get-thumb', function (req, res) {
    var photo = req.query.path;
    var inputImage = fs.createReadStream(photo)
    res.contentType('jpeg')
    sharp(photo).resize(100, 100).toFormat('jpeg', {quality: 75}).toBuffer().then(function(data) {
        res.end(data)
    })

//    inputImage.pipe(resizer.cover({height: 100, width:100})).pipe(res);
})

app.get('/get-photo', function (req, res) {
    var photo = req.query.path;
    var preview = req.query.preview;
    res.contentType('jpeg')

    if (preview) {
        sharp(photo).resize(850, 450).max().toFormat('jpeg', {quality: 75}).toBuffer().then(function(data) {
            res.end(data)
        })
    } else {
        sharp(photo).toFormat('jpeg', {quality: 75}).toBuffer().then(function(data) {
            res.end(data)
        })
    }
})

app.get('/list-slots', function (req, res) {
    var filename = dirname('/../data/slots.yaml');
    var slots = yaml.safeLoad(fs.readFileSync(filename));
    res.send(JSON.stringify(slots))
})


app.get('/list-photos', function (req, res) {
    var folder = req.query.folder;
    var data = {"photos": []}

    fs.readdirSync(folder).forEach(filename => {
        console.log(filename)
        if ( /\.(jpe?g|png|tif|tiff)$/i.test(filename) ) {

            data.photos.push(folder + '/' + filename);
        }
    })
    res.send(JSON.stringify(data))
})


app.post('/config', function(req, res) {
    fs.writeFileSync(dirname('/../data/config.yaml'), yaml.safeDump(req.body))
    res.send({})
})

app.get('/config', function(req, res) {
    var config_file = dirname('/../data/config.yaml')
    var config = yaml.safeLoad(fs.readFileSync(config_file))
    res.send(JSON.stringify(config))
})

app.post('/save-page', function(req, res) {
    var id = slugify(req.body.name)
    req.body.id = id;
    fs.writeFileSync(dirname('/../data/pages/' + id + '.yaml'), yaml.safeDump(req.body))
    res.send({})
})

app.post('/save-layout', function(req, res) {
    fs.writeFileSync(dirname('/../data/layouts/' + req.body.name + '.yaml'), yaml.safeDump(req.body))
    res.send({})
})

app.get('/layouts', function(req, res) {
    var data = {"layouts": []}
    var folder = dirname('/../data/layouts')
    fs.readdirSync(folder).forEach(filename => {
        if ( /\.(yaml)$/i.test(filename) ) {
            data.layouts.push(yaml.safeLoad(fs.readFileSync(folder + '/' + filename)));
        }
    })
    res.send(JSON.stringify(data))
})

app.get('/pages', function(req, res) {
    var data = {"pages": []}
    var folder = dirname('/../data/pages')
    fs.readdirSync(folder).forEach(filename => {
        if ( /\.(yaml)$/i.test(filename) ) {
            data.pages.push(yaml.safeLoad(fs.readFileSync(folder + '/' + filename)));
        }
    })
    res.send(JSON.stringify(data))
})

app.use('/js', express.static(dirname('/js')));
app.use('/css', express.static(dirname('/css')));
app.use(bodyParser);

server.listen(3000, '0.0.0.0', function () {
  console.log('Example app listening on port 3000!');

});
