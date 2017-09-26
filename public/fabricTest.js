/**
  * 이미지편집기 샘플제작(fabricJs v1.7.17 사용)
  * @Date 2017-09-25 최종수정
  * @Author roomy
  */

(function() {
	var canvas = new fabric.CanvasEx('c');
	var f = fabric.Image.filters;	// 패브릭 필터 변수 (Using fabric filters)
	var mosaicIdx = 16						// 모자이크 필터 인덱스 (The ordering index of mosaic effect)
	var editBox = null;						// 크롭과 모자이크를 위한 가상박스 (Virtual box to crop or apply mosaic)
	var boxWidth = null;					// 가상박스 가로 (virtual box's width)
	var boxHeight = null;					// 가상박스 세로 (Virtual box's height)
	var boxAngle = null;					// 가상박스 앵글 (Virtual box's angle)
	var isCrop = false;						// true : cropping, false : not
	var isWatermark = false;			// true : applying watermark, false : not

	fabric.Object.prototype.transparentCorners = false;
	fabric.Image.fromURL('/public/images/oizo.jpg', function(img) {
		var initCanvas, initJson;

		img.set({
			name: 'main'
			, left: canvas.width / 2 - (img.width / 2)
			, top: canvas.height / 2 - (img.height / 2)
			, hasControls : true
			, lockRotation: false
			, lockMovementX : false
			, lockMovementY : false
			, hasRotatingPoint: false
		});
		canvas.add(img);
	});

	function setObjControl() {
		canvas.getObjects().map(function(obj){
			obj.set({
				hasControls : true
				, lockRotation: false
				, lockMovementX : false
				, lockMovementY : false
				, hasRotatingPoint: false
			});

			canvas.add(obj);
		});
	}

	function getImageObject() {
		var activeObj = canvas.getActiveObject();
		var imageName = null;
		var returnObj = null;

		canvas.getObjects().map(function(obj){
			imageName = obj.name || "";
			if(obj.isType("image") && (imageName != "watermark" || imageName != "editBox")) {
				returnObj = obj;
			}
		});

		return returnObj;
	}

	function applyFilter(index, filter) {
		var obj = canvas.getActiveObject() || getImageObject();
		obj.filters[index] = filter;
		obj.applyFilters(canvas.renderAll.bind(canvas));
	}

	function getFilter(index) {
		var obj = canvas.getActiveObject() || getImageObject();
		return obj.filters[index];
	}

	function applyFilterValue(index, prop, value) {
		var obj = canvas.getActiveObject() || getImageObject();

		if (obj.filters[index]) {
			obj.filters[index][prop] = value;
			obj.applyFilters(canvas.renderAll.bind(canvas));
		}
	}

	function insertWatermarkImage() {
		var watermark = new Image();

		isWatermark = true;
		canvas.remove(getWatermarkObject());

		watermark.src = '/public/images/imgTestLogo.png';
		watermark.onload = function() {
			var imgInstance = new fabric.Image(this, {
				name : "watermark"
				, hasControls : true
				, lockRotation: false
				, lockMovementX : false
				, lockMovementY : false
				, hasRotatingPoint : false
			});

			var activeObj = getImageObject();
			var watermarkWidth = imgInstance.width;
			var watermarkHeight = imgInstance.height;
			var imageTop = activeObj.top < 0 ? 0 : activeObj.top;
			var imageLeft = activeObj.left < 0 ? 0 : activeObj.left;
			var imageWidth = activeObj.width;
			var imageHeight = activeObj.height;

			imgInstance.set({
				top : imageTop,
				left : imageLeft,
				scaleX: 1,
				scaleY: 1,
				opacity: 0.5
			});

			canvas.add(imgInstance).setActiveObject(imgInstance);
			canvas.renderAll();
		}
	}

	function getWatermarkObject(){
		var imgObj = null;

		canvas.getObjects().map(function(obj){
			if(obj.name == "watermark"){
				imgObj = obj;
			}
		});

		return imgObj;
	}

	function grouping(){
		var objs = [];
		var groupObj = null;
		var dataUrl = null;

		// editBox를 제외한 모든 요소를 배열화 (Put all objects on the canvas into the array except the editBox)
		objs = canvas._objects.filter(function(obj){
			if(obj.name != "editBox") {
				return obj;
			}
		});

		// Clear canvas
		canvas.clear();

		// 요소들을 묶은 후 이미지로 복사 (Clone to image after grouping all objects)
		groupObj = new fabric.Group(objs,{});
		groupObj.cloneAsImage(function(o) {
			canvas.add(o);

			o.set({
				hasControls : true
				, lockRotation: false
				, lockMovementX : false
				, lockMovementY : false
				, hasRotatingPoint : false
			});

			o.center();
			o.setCoords();

			// Complete putting watermark
			isWatermark = false;
		});

		canvas.renderAll();

		// get the image url to save (use it later, maybe when start the 한국일보 project)
		dataUrl = canvas.toDataURL({
			format: 'jpeg'
			, left: 100
			, top: 100
			, width: 200
			, height: 200
		});
	}

	function setEditBox() {
		var obj = getImageObject();
		var realImageCoords = "";

		boxAngle = obj.getAngle();
		isCrop = true;

		if(editBox != null){
			canvas.remove(editBox);
		}

		realImageCoords = getImageCoords(obj);

		editBox = new fabric.Rect({
			name: 'editBox',
			fill: 'rgba(0,0,0,0.3)',
			originX: 'left',
			originY: 'top',
			stroke: '#444',
			strokeDashArray: [4, 4],
			opacity: 1,
			top: realImageCoords.imgTop,
			left: realImageCoords.imgLeft,
			width: 1,
			height: 1,
			borderColor: '#444',
			cornerColor: '#444',
			hasRotatingPoint: false,
			scaleX: 1,
			scaleY: 1,
			customOptionForCrop : 1,
			strokeWidth : 1
		});

		if(boxWidth == null && boxHeight == null) {
			boxWidth = (obj.width * obj.scaleX ) / 2;
			boxHeight = (obj.height * obj.scaleY ) / 2;
		}

		canvas.on({
			'object:scaling' : function(e) {
				var obj = e.target;
				var imgScale = null;
				var newStrokeWidth = null;

				if(obj.name == "editBox") {
					imgScale = obj.scaleX;
					newStrokeWidth = obj.customOptionForCrop / ((obj.scaleX + obj.scaleY) / 2) * imgScale;

					obj.set('strokeWidth', newStrokeWidth);

					if(obj.customOptionForCrop) {
						boxWidth = Math.ceil(obj.width * obj.scaleX);
						boxHeight = Math.ceil(obj.height * obj.scaleY);
					}
				}
			},

			'object:rotating' : function() {
				boxAngle = obj.getAngle();
				editBox.rotate(boxAngle);
			},

			'mouse:dblclick' : function() {
				var obj = canvas.getActiveObject() || getImageObject();

				if(obj.name == "editBox") {
					actionCrop(boxWidth, boxHeight);
				} else {
					alert("오려내는 영역이 아닙니다.");
				}
			}
		});

		if(boxAngle != null) {
			editBox.rotate(boxAngle);
		}

		editBox.width = boxWidth;
		editBox.height = boxHeight;

		canvas.add(editBox).setActiveObject(editBox);
		canvas.renderAll();
	}

	function getImageCoords(obj) {
		var toDataParams = {};

		obj.angle = boxAngle;
		canvas.renderAll();

		toDataParams = {
				"imgWidth" : (obj.width * obj.scaleX) > canvas.width ? canvas.width : (obj.width * obj.scaleX),
				"imgHeight" : (obj.height * obj.scaleY) > canvas.height ? canvas.height: (obj.height * obj.scaleY),
				"imgTop" : obj.top < 0 ? 0 : obj.top,
				"imgLeft" : obj.left < 0 ? 0 : obj.left
		};

		return toDataParams;
	}

	function actionCrop(paramW, paramH) {
		var image = new Image();
		var imgWidth = null;
		var imgHeight = null;
		var activeObj = null;
		var realImageCoords = null;

		activeObj = getImageObject();
		realImageCoords = getImageCoords(activeObj);

		if(editBox.intersectsWithObject(activeObj) || editBox.isContainedWithinObject(activeObj)){
			var X = realImageCoords.imgLeft,	// original image size
			Y = realImageCoords.imgTop,
			W = realImageCoords.imgWidth,
			H = realImageCoords.imgHeight,
			x1 = editBox.left,								// editBox size
			y1 = editBox.top,
			w1 = paramW,
			h1 = paramH;

			var cropElement = {
				newX: 0
				, newY: 0
				, newW: 0
				, newH: 0
			};

			cropElement.newX = (x1 < X ? X : x1);
			cropElement.newY = (y1 < Y ? Y : y1);
			cropElement.newW = (x1+w1 > X+W? X+W - cropElement.newX : x1+w1 - cropElement.newX);
			cropElement.newH = (y1+h1 > Y+H ? Y+H - cropElement.newY : y1+h1 - cropElement.newY);

			// Clear editBox and all events
			canvas.off('object:scaling');
			canvas.off('mouse:dblclick');
			editBox = null;
			boxWidth = null;
			boxHeight = null;

			canvas.forEachObject(function(obj){
				if(!obj.isType("image") ){
					canvas.remove(obj);
				}
			});

			image.src = activeObj.canvas.toDataURL({
				format : "jpeg"
				, quality : 1
				, multiplier: 1
				, left: Math.ceil(cropElement.newX)
				, top: Math.ceil(cropElement.newY)
				, width: parseInt(cropElement.newW)
				, height: parseInt(cropElement.newH)
			});
			image.crossOrigin = 'anonymous';
		}

		image.onload = function() {
			var imgInstance = new fabric.Image(image, {
				name : 'main_crop'
				, hasControls : true
				, lockRotation: false
				, lockMovementX : false
				, lockMovementY : false
				, hasRotatingPoint : false
			});

			imgWidth = parseInt(imgInstance.width);
			imgHeight = parseInt(imgInstance.height);

			imgInstance.set({
				width : imgWidth
				, height : imgHeight
				, scaleX : 1
				, scaleY : 1
			});

			canvas.remove(getImageObject());
			canvas.remove(getWatermarkObject());
			canvas.add(imgInstance).setActiveObject(imgInstance);

			imgInstance.center();
			imgInstance.setCoords();

			canvas.renderAll();
		};
	}

	function actionMosaic(paramW, paramH) {
		var obj = getImageObject();
//		var cloneObj = fabric.util.object.clone(obj);
		var fMosaic = null;
		var realImageCoords = null;

		realImageCoords = getImageCoords(obj);

		if(editBox.intersectsWithObject(obj) || editBox.isContainedWithinObject(obj)){
			var X = realImageCoords.imgLeft,	// original image size
			Y = realImageCoords.imgTop,
			W = realImageCoords.imgWidth,
			H = realImageCoords.imgHeight,
			x1 = editBox.left,					// editBox size
			y1 = editBox.top,
			w1 = paramW,
			h1 = paramH

			var mosaicElement = {
					innerX: 0,
					innerY: 0,
					newX: 0,
					newY: 0,
					newW: 0,
					newH: 0
				};

			mosaicElement.innerX = (x1 < X ? X : x1);
			mosaicElement.innerY = (y1 < Y ? Y : y1);
			mosaicElement.newX = (x1 < X ? 0 : (x1 - X));
			mosaicElement.newY = (y1 < Y ? 0 : (y1 - Y));
			mosaicElement.newW = (x1+w1 > X+W? X+W - mosaicElement.innerX : x1+w1 - mosaicElement.innerX);
			mosaicElement.newH = (y1+h1 > Y+H ? Y+H - mosaicElement.innerY : y1+h1 - mosaicElement.innerY);

			// Clear all events
			canvas.remove(editBox);
			canvas.off('object:scaling');
			canvas.off('mouse:dblclick');
			editBox = null;
			boxWidth = null;
			boxHeight = null;

			fMosaic = new f.Pixelate({
				blocksize : 12
				, newX : mosaicElement.newX / obj.scaleX
				, newY : mosaicElement.newY / obj.scaleY
				, newW : mosaicElement.newW / obj.scaleX
				, newH : mosaicElement.newH / obj.scaleY
			});

			obj.filters[mosaicIdx] = fMosaic;
			obj.applyFilters(canvas.renderAll.bind(canvas));
		}
	}

	function imgPlaceTest(loc) {
		var obj = getImageObject();
		var testBox = null;

		realImageCoords = getImageCoords(obj);

		testBox = new fabric.Rect({
			name: loc,
			fill: 'rgba(2,5,1,0.4)',
			top: realImageCoords.imgTop,
			left: realImageCoords.imgLeft,
			width: realImageCoords.imgWidth / 2,
			height: realImageCoords.imgHeight / 2,
			hasRotatingPoint: false,
			lockMovementX: true,
			lockMovementY: true,
			lockScalingX: true,
			lockScalingY: true,
		});

		switch(loc) {
			case "one" : {
				testBox.top = realImageCoords.imgTop;
				testBox.left = realImageCoords.imgLeft;
				break;
			}
			case "two" : {
				testBox.top = realImageCoords.imgTop;
				testBox.left = (realImageCoords.imgLeft + realImageCoords.imgWidth) - testBox.width;
				break;
			}
			case "three" : {
				testBox.top = (realImageCoords.imgTop + realImageCoords.imgHeight) - testBox.height;
				testBox.left = realImageCoords.imgLeft;
				break;
			}
			case "four" : {
				testBox.top = (realImageCoords.imgTop + realImageCoords.imgHeight) - testBox.height;
				testBox.left = (realImageCoords.imgLeft + realImageCoords.imgWidth) - testBox.width;
				break;
			}
		}
		canvas.add(testBox).setActiveObject(testBox);
		canvas.bringToFront(testBox);
		canvas.renderAll();
	}

	function imgReplaceTest(loc) {
		var imgObj = getImageObject();
		var imageName = "";

		canvas.getObjects().map(function(obj){
			imageName = obj.name || "";
			if(imageName == loc) {
				canvas.remove(obj);
			}
		});
	}

	$("#one").on("click", function() {
		if(!$(this).is(":checked")) {
			imgReplaceTest("one");
		} else {
			imgPlaceTest("one");
		}
	});

	$("#two").on("click", function() {
		if(!$(this).is(":checked")) {
			imgReplaceTest("two");
		} else {
			imgPlaceTest("two");
		}
	});

	$("#three").on("click", function() {
		if(!$(this).is(":checked")) {
			imgReplaceTest("three");
		} else {
			imgPlaceTest("three");
		}
	});

	$("#four").on("click", function() {
		if(!$(this).is(":checked")) {
			imgReplaceTest("four");
		} else {
			imgPlaceTest("four");
		}
	});

	$('#filterBox').on("click", function() {
		if(!isWatermark) {
			setEditBox();
		} else {
			alert("다중 이미지는 먼저 그룹으로 묶어주세요.");
		}
	});

	$('#crop').on("click", function (event) {
		actionCrop(boxWidth, boxHeight);
	});

	$('#mosaic').on("click", function (event) {
		mosaicIdx++;
		actionMosaic(boxWidth, boxHeight);
	});

	$('#grouping').on("click", function() {
		grouping();
	});

	$('#watermark').on("click", function() {
		insertWatermarkImage();
	});

	$('#brownie').on("click", function() {
		applyFilter(4, this.checked && new f.ColorMatrix({
			matrix : [
				0.59970,0.34553,-0.27082,0,0.186,
				-0.03770,0.86095,0.15059,0,-0.1449,
				0.24113,-0.07441,0.44972,0,-0.02965,
				0,0,0,1,0
			]
		}));
	});

	$('#vintage').on("click", function() {
		applyFilter(0, this.checked && new f.ColorMatrix({
			matrix : [
				0.62793,0.32021,-0.03965,0,0.03784,
				0.02578,0.64411,0.03259,0,0.02926,
				0.04660,-0.08512,0.52416,0,0.02023,
				0,0,0,1,0
			]
		}));
	});

	$('#technicolor').on("click", function() {
		applyFilter(1, this.checked && new f.ColorMatrix({
			matrix : [
				1.91252,-0.85453,-0.09155,0,0.04624,
				-0.30878,1.76589,-0.10601,0,-0.27589,
				-0.23110,-0.75018,1.84759,0,0.12137,
				0,0,0,1,0
			]
		}));
	});

	$('#polaroid').on("click", function() {
		applyFilter(2, this.checked && new f.ColorMatrix({
			matrix : [
				1.438,-0.062,-0.062,0,0,
				-0.122,1.378,-0.122,0,0,
				-0.016,-0.016,1.483,0,0,
				0,0,0,1,0
			]
		}));
	});

	$('#kodachrome').on("click", function() {
		applyFilter(3, this.checked && new f.ColorMatrix({
			matrix : [
				1.12855,-0.39673,-0.03992,0,0.24991,
				-0.16404,1.08352,-0.05498,0,0.09698,
				-0.16786,-0.56034,1.60148,0,0.13972,
				0,0,0,1,0
			]
		}));
	});

	$('#blackwhite').on("click", function() {
		applyFilter(4, this.checked && new f.ColorMatrix({
			matrix : [
				0.45, 0.45, 0.45, 0, -1,
				0.45, 0.45, 0.45, 0, -1,
				0.45, 0.45, 0.45, 0, -1,
				0, 0, 0, 10, 0
			]
		}));
	});

	$('#grayscale').on("click", function() {
		applyFilter(5, this.checked && new f.Grayscale());
	});

	$('#invert').on("click", function() {
		applyFilter(6, this.checked && new f.Invert());
	});

	$('#sepia').on("click", function() {
		applyFilter(7, this.checked && new f.Sepia());
	});

	$('#sepia2').on("click", function () {
		applyFilter(8, this.checked && new f.Sepia2());
	});

	$('#brightness').on("click", function () {
		applyFilter(9, this.checked && new f.Brightness({
			brightness: parseFloat($('#brightness-value').val() * 100)
		}));
	});

	$('#brightness-value').on("input", function() {
		applyFilterValue(9, 'brightness', parseFloat(this.value * 100));
	});

	$('#contrast').on("click", function () {
		applyFilter(10, this.checked && new f.Contrast({
			contrast: parseFloat($('#contrast-value').val()*100)
		}));
	});

	$('#contrast-value').on("input", function() {
		applyFilterValue(10, 'contrast', parseFloat(this.value*100));
	});

	$('#saturation').on("click", function () {
		applyFilter(11, this.checked && new f.Saturate({
			saturate: parseFloat($('#saturation-value').val() * 100)
		}));
	});

	$('#saturation-value').on("input", function() {
		applyFilterValue(11, 'saturate', parseFloat(this.value * 100));
	});

	$('#noise').on("click", function () {
		applyFilter(12, this.checked && new f.Noise({
			noise: parseInt($('#noise-value').val(), 10)
		}));
	});

	$('#noise-value').on("input", function() {
		applyFilterValue(12, 'noise', parseInt(this.value, 10));
	});

	$('#blur').on("click", function() {
		applyFilter(13, this.checked && new f.StackBlur($('#blur-value').val()*100));
	});

	$('#blur-value').on("input", function() {
		if($("#blur").is(":checked")) {
			applyFilter(13, new f.StackBlur($('#blur-value').val()*100));
		}
	});

	$('#sharpen').on("click", function() {
		applyFilter(14, this.checked && new f.Convolute({
			matrix: [
				0, -1,  0,
				-1,  5, -1,
				0, -1,  0
				]
		}));
	});

	$('#emboss').on("click", function() {
		applyFilter(15, this.checked && new f.Convolute({
			matrix: [1,   1,  1,
				1, 0.7, -1,
				-1,  -1, -1 ]
		}));
	});

	$('#blend').on("click", function() {
		applyFilter(16, this.checked && new f.Blend({
			color: $('#blend-color').val(),
			mode: $('#blend-mode').val(),
			alpha: $('#blend-alpha').val()
		}));
	});

	$('#blend-mode').on("change", function() {
		applyFilterValue(16, 'mode', this.value);
	});

	$('#blend-color').on("change", function() {
		applyFilterValue(16, 'color', this.value);
	});

	$('#blend-alpha').on("input", function() {
		applyFilterValue(16, 'alpha', this.value);
	});

	$('#opacity-image-value').on("input", function() {
		var obj = getImageObject();
		var value = $('#opacity-image-value').val();

		obj.set('opacity', value);
		canvas.renderAll();
	});
})();
