function getOrientation(file, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {

        var view = new DataView(e.target.result);
        if (view.getUint16(0, false) != 0xFFD8) return callback(-2);
        var length = view.byteLength, offset = 2;
        while (offset < length) {
            var marker = view.getUint16(offset, false);
            offset += 2;
            if (marker == 0xFFE1) {
                if (view.getUint32(offset += 2, false) != 0x45786966) return callback(-1);
                var little = view.getUint16(offset += 6, false) == 0x4949;
                offset += view.getUint32(offset + 4, little);
                var tags = view.getUint16(offset, little);
                offset += 2;
                for (var i = 0; i < tags; i++)
                    if (view.getUint16(offset + (i * 12), little) == 0x0112)
                        return callback(view.getUint16(offset + (i * 12) + 8, little));
            }
            else if ((marker & 0xFF00) != 0xFF00) break;
            else offset += view.getUint16(offset, false);
        }
        return callback(-1);
    };
    reader.readAsArrayBuffer(file);
}

function resetImageOrientation(srcBase64, srcOrientation, callback) {
    var img = new Image();

    img.onload = function () {
        var width = img.width,
            height = img.height,
            canvas = document.createElement('canvas'),
            ctx = canvas.getContext("2d");
        canvas.style.visibility = "hidden";

        // set proper canvas dimensions before transform & export
        if ([5, 6, 7, 8].indexOf(srcOrientation) > -1) {
            canvas.width = height;
            canvas.height = width;
        } else {
            canvas.width = width;
            canvas.height = height;
        }

        // transform context before drawing image
        switch (srcOrientation) {
            case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
            case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
            case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
            case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
            case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
            case 7: ctx.transform(0, -1, -1, 0, height, width); break;
            case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
            default: ctx.transform(1, 0, 0, 1, 0, 0);
        }

        // draw image
        ctx.drawImage(img, 0, 0);

        // export base64
        callback(canvas.toDataURL());
    };

    img.src = srcBase64;
};

//img_object is the object where the img src is modified
function readFile(file, send_callback) {
    var reader = new FileReader();

    //orientation = getOrientation(file);
    reader.onloadend = function () {

        getOrientation(file, function (orientation) {
            //console.log("Orientation: " + orientation)
            resetImageOrientation(reader.result, orientation, function (resetBase64Image) {
                //console.log("New img: " + resetBase64Image)
                processImage(resetBase64Image, file.type, send_callback);
            })
        });


    }

    reader.onerror = function () {
        alert('There was an error reading the file!');
    }

    reader.readAsDataURL(file);
}

function processImage(dataURL, fileType, send_callback) {
    var maxWidth = 128;
    var maxHeight = 128;


    //orientation = getOrientation(dataURL);
    //console.log("img load: orientation " + orientation);

    //new_data_url =  resetImageOrientation(dataURL, orientation);
    //console.log("img load: new url " + new_data_url);
    var image = new Image();
    image.src = dataURL;


    image.onload = function () {
        var width = image.width;
        var height = image.height;
        var shouldResize = (width > maxWidth) || (height > maxHeight);

        var newWidth;
        var newHeight;

        if (width > height) {
            newHeight = height * (maxWidth / width);
            newWidth = maxWidth;
        } else {
            newWidth = width * (maxHeight / height);
            newHeight = maxHeight;
        }


        var canvas = document.createElement('canvas');
        canvas.style.visibility = "hidden"
        canvas.width = newWidth;
        canvas.height = newHeight;

        var context = canvas.getContext('2d');

        context.drawImage(this, 0, 0, newWidth, newHeight);

        dataURL = canvas.toDataURL(fileType);

        //$('#UUID_FROM_SERVER_TODO').find('.player-img').attr("src", dataURL);

        //this was just for debugging to change local card image
        //img_object.attr("src", dataURL);

        //send the base64 encoded image to the server.
        send_callback(dataURL);

        //console.log("Img source: " + dataURL);
        //sendFile(dataURL);
    };

    image.onerror = function () {
        alert('There was an error processing your file!');
    };
}
