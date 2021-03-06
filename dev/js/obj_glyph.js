// start of file

//-------------------------------------------------------
// GLYPH OBJECT
//-------------------------------------------------------
	function Glyph(oa){

		this.objtype = 'glyph';

		this.glyphname = oa.glyphname || getGlyphName(oa.glyphhex) || 'ERROR_GLYPHNAME';
		this.glyphhtml = oa.glyphhtml || hexToHTML(oa.glyphhex) || 'ERROR_GLYPHHTML';
		this.isautowide = isval(oa.isautowide)? oa.isautowide : true;
		this.glyphwidth = isval(oa.glyphwidth)? oa.glyphwidth : 0;
		this.leftsidebearing = isval(oa.leftsidebearing)? oa.leftsidebearing : false;
		this.rightsidebearing = isval(oa.rightsidebearing)? oa.rightsidebearing : false;
		this.ratiolock = isval(oa.ratiolock)? oa.ratiolock : false;
		this.maxes = oa.maxes || clone(_UI.mins);
		this.shapes = oa.shapes || [];
		this.usedin = oa.usedin || [];

		var lc = 0;
		var cs = 0;
		if(oa.shapes && oa.shapes.length){
			for(var i=0; i<oa.shapes.length; i++) {
				if(oa.shapes[i].objtype === 'componentinstance'){
					//debug('GLYPH - hydrating ' + oa.shapes[i].name);
					this.shapes[i] = new ComponentInstance(oa.shapes[i]);
					lc++;
				} else {
					//debug('GLYPH - hydrating ' + oa.shapes[i].name);
					this.shapes[i] = new Shape(oa.shapes[i]);
					cs++;
				}
			}
		}

		this.calcGlyphMaxes();
	}



//-------------------------------------------------------
// GLYPH METHODS
//-------------------------------------------------------
/*
	getCmapCode
	getHTMLCode
*/

	Glyph.prototype.calcGlyphMaxes = function(){
		//debug('CALCGLYPHMAXES - this char\n'+json(this));

		var sh;
		var tmax = clone(_UI.mins);
		this.maxes = clone(_UI.mins);

		if(this.shapes.length > 0){
			for(var jj=0; jj<this.shapes.length; jj++) {
				sh = this.shapes[jj];
				tmax = sh.getMaxes();

				this.maxes.xmax = Math.max(tmax.xmax, this.maxes.xmax);
				this.maxes.xmin = Math.min(tmax.xmin, this.maxes.xmin);
				this.maxes.ymax = Math.max(tmax.ymax, this.maxes.ymax);
				this.maxes.ymin = Math.min(tmax.ymin, this.maxes.ymin);
			}
		} else {
			this.maxes = {
				'xmax': 0,
				'xmin': 0,
				'ymax': 0,
				'ymin': 0
			};
		}

		this.calcGlyphWidth();

		return this.maxes;
	};

	Glyph.prototype.calcGlyphWidth = function(){
		if(!this.isautowide) return;
		this.glyphwidth = Math.max(this.maxes.xmax, 0);
	};

	Glyph.prototype.getTotalWidth = function() {
		this.calcGlyphWidth();
		if(!this.isautowide) return this.glyphwidth;
		else return this.glyphwidth + this.getLSB() + this.getRSB();
	};

	Glyph.prototype.getLSB = function() {
		if(this.leftsidebearing === false) return _GP.projectsettings.defaultlsb;
		else return this.leftsidebearing;
	};

	Glyph.prototype.getRSB = function() {
		if(this.rightsidebearing === false) return _GP.projectsettings.defaultrsb;
		else return this.rightsidebearing;
	};

	Glyph.prototype.drawGlyphToArea = function(lctx, view, uselsb){
		// debug('\n Glyph.drawGlyphToArea - START');
		// debug('\t drawing ' + this.glyphname);

		var sl = this.shapes;
		var shape, path;
		var lsb = uselsb? this.getLSB() : 0;

		lctx.beginPath();
		for(var j=0; j<sl.length; j++) {
			shape = sl[j];
			if(shape.visible) {
				// debug('\t drawing shape ' + j);
				// path = shape.getPath();
				// path.drawPathToArea(lctx, view, lsb);
				shape.drawShapeToArea(lctx, view);
			}
		}

		lctx.fillStyle = _GP.projectsettings.colors.glyphfill;
		lctx.closePath();
		lctx.fill('nonzero');

		// debug(' Glyph.drawGlyphToArea - END\n');
		return (this.getTotalWidth()*view.dz);
	};

	Glyph.prototype.makeSVG = function(size, gutter) {
		// debug('\n Glyph.makeSVG - START');
		size = size || _UI.thumbsize;
		gutter = gutter || _UI.thumbgutter;
		var upm = _GP.projectsettings.upm;
		var desc = upm - _GP.projectsettings.ascent;
		var charscale = (size-(gutter*2)) / size;
		var gutterscale = (gutter / size) * upm;
		var vbsize = upm - (gutter*2);
		var pathdata = this.makeSVGpathData();

		// Assemble SVG
		var re = '<svg version="1.1" ';
		re += 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ';
		re += 'width="'+size+'" height="'+size+'" viewBox="0,0,'+vbsize+','+vbsize+'">';
		re += '<g transform="translate('+(gutterscale)+','+(upm-desc-(gutterscale/2))+') scale('+charscale+',-'+charscale+')">';
		// re += '<rect x="0" y="-'+desc+'" height="'+desc+'" width="1000" fill="lime"/>';
		// re += '<rect x="0" y="0" height="'+(upm-desc)+'" width="1000" fill="cyan"/>';
		re += '<path d="' + pathdata + '"/>';
		re += '</g>';
		re += '</svg>';

		// debug(' Glyph.makeSVG - END\n');

		return re;
	};

	Glyph.prototype.makeSVGpathData = function() {
		var sl = this.shapes;
		var pathdata = '';
		var lsb = this.getLSB();
		var shape, path;

		// Make Pathdata
		for(var j=0; j<sl.length; j++) {
			shape = sl[j];
			if(shape.visible) {
				if(shape.objtype === 'componentinstance'){
					pathdata += shape.getTransformedGlyph().makeSVGpathData();
				} else {
					path = shape.getPath();
					path.updatePathPosition(lsb, 0, true);
					pathdata += path.makeSVGpathData('Glyph ' + this.name + ' Shape ' + shape.name);
					if(j < sl.length-1) pathdata += ' ';
				}
			}
		}
		if(trim(pathdata) === '') pathdata = 'M0,0Z';

		return pathdata;
	};

	Glyph.prototype.setGlyphPosition = function(nx, ny, force){
		// debug('SETGLYPHPOSITION nx/ny/force: ' + nx + ' ' + ny + ' ' + force);
		if(nx !== false) nx = parseFloat(nx);
		if(ny !== false) ny = parseFloat(ny);
		var dx = (nx)? (nx - this.maxes.xmin) : 0;
		var dy = (ny)? (ny - this.maxes.ymax) : 0;
		this.updateGlyphPosition(dx, dy, force);
	};

	Glyph.prototype.updateGlyphPosition = function(dx, dy, force){
		// debug('UPDATEGLYPHPOSITION dx/dy/force: ' + dx + ' ' + dy + ' ' + force);
		if(dx !== false) dx = parseFloat(dx);
		if(dy !== false) dy = parseFloat(dy);
		var cs = this.shapes;
		for(var i=0; i<cs.length; i++){
			cs[i].updateShapePosition(dx, dy, force);
		}
		this.calcGlyphMaxes();
	};

	Glyph.prototype.setGlyphSize = function(nw, nh, ratiolock){
		// debug('SET GLYPHSIZE ---- nw/nh/ra:\t' + nw + '\t ' + nh + '\t ' + ratiolock);
		// debug('\t maxes: ' + json(this.maxes));
		if(nw !== false) nw = parseFloat(nw);
		if(nh !== false) nh = parseFloat(nh);
		var ch = (this.maxes.ymax - this.maxes.ymin);
		var cw = (this.maxes.xmax - this.maxes.xmin);
		var dw = (nw)? (nw - cw) : 0;
		var dh = (nh)? (nh - ch) : 0;

		if(ratiolock){
			if(Math.abs(nh) > Math.abs(nw)) dw = (cw*(nh/ch)) - cw;
			else dh = (ch*(nw/cw)) - ch;
		}
		this.updateGlyphSize(dw, dh, false);
	};

	Glyph.prototype.updateGlyphSize = function(dw, dh, ratiolock){
		// debug('UPDATE GLYPHSIZE - dw/dh/ra:\t' + dw + '\t ' + dh + '\t ' + ratiolock);
		if(dw !== false) dw = parseFloat(dw);
		if(dh !== false) dh = parseFloat(dh);
		var oldw = this.maxes.xmax - this.maxes.xmin;
		var oldh = this.maxes.ymax - this.maxes.ymin;
		var neww = Math.max((oldw + dw), 1);
		var newh = Math.max((oldh + dh), 1);
		var ratiodh = (newh/oldh);
		var ratiodw = (neww/oldw);

		// debug('\tadj dh/dw:\t' + dh + '\t ' + dw);
		// debug('\told h/w:\t' + oldh + '\t ' + oldw);
		// debug('\tnew h/w:\t' + newh + '\t ' + neww);
		// debug('\tratio dh/dw:\t' + ratiodh + '\t ' + ratiodw);

		var cs = this.shapes;
		var ts, tsmaxes, pnw, pnh, pnx, pny;
		for(var i=0; i<cs.length; i++){
			ts = cs[i];
			tsmaxes = ts.getMaxes();

			// scale
			if(dw === 0) pnw = false;
			else pnw = ((tsmaxes.xmax - tsmaxes.xmin)*ratiodw);
			if(dh === 0) pnh = false;
			else pnh = ((tsmaxes.ymax - tsmaxes.ymin)*ratiodh);

			ts.setShapeSize(pnw, pnh, ratiolock);

			// move
			if(dw === 0) pnx = false;
			else pnx = (ratiodw * (ts.maxes.xmin - this.maxes.xmin)) + this.maxes.xmin;
			if(dh === 0) pny = false;
			else pny = (ratiodh * (ts.maxes.ymin - this.maxes.ymin)) + this.maxes.ymin + (ts.maxes.ymax - ts.maxes.ymin);

			ts.setShapePosition(pnx, pny, true);
		}

		this.calcGlyphMaxes();
	};

	Glyph.prototype.flipEW = function(){
		var mid = ((this.maxes.xmax - this.maxes.xmin) / 2) + this.maxes.xmin;
		for(var s=0; s < this.shapes.length; s++){
			this.shapes[s].flipEW(mid);
		}
	};

	Glyph.prototype.flipNS = function(){
		var mid = ((this.maxes.ymax - this.maxes.ymin) / 2) + this.maxes.ymin;
		for(var s=0; s < this.shapes.length; s++){
			this.shapes[s].flipNS(mid);
		}
	};

	Glyph.prototype.sendShapesTo = function(chid) {
		var destination = getGlyph(chid, true);
		destination.shapes = clone(destination.shapes.concat(this.shapes));
		destination.calcGlyphMaxes();
		for(var c=0; c<this.shapes.length; c++){
			if(this.shapes[c].objtype === 'componentinstance') addToUsedIn(this.shapes[c].link, chid);
		}
	};

	Glyph.prototype.isHere = function(x,y) {
		for(var s=0; s < this.shapes.length; s++){
			if(this.shapes[s].isHere(x,y)) return true;
		}

		return false;
	};




//-------------------------------------------------------
// GLYPH FUNCTIONS
//-------------------------------------------------------
	// GET
	function getGlyph(ch, create) {
		// debug('\n getGlyph - START');
		// debug('\t passed ' + ch);
		// debug('\t force create? ' + create);

		if(!ch){
			// debug('getGlyph - not passed an ID, returning false');
			return false;
		}

		ch = ''+ch;
		var rechar;

		if (ch.indexOf('0x', 2) > -1){
			rechar = _GP.ligatures[ch];
			// debug('\t retrieved ' + rechar + ' from ligatures.');
			if(rechar){
				return rechar;
			} else if(create){
				// debug('\t create was true, returning a new ligature.');
				_GP.ligatures[ch] = new Glyph({'glyphhex':ch});
				return _GP.ligatures[ch];
			}
		} else if(ch.indexOf('0x') > -1){
			rechar = _GP.glyphs[ch];
			// debug('\t retrieved ' + rechar + ' from glyphs.');
			if(rechar){
				return rechar;
			} else if(create){
				// debug('\t create was true, returning a new char.');
				_GP.glyphs[ch] = new Glyph({'glyphhex':ch});
				return _GP.glyphs[ch];
			}
		} else {
			// debug('\t component, retrieved');
			// debug(_GP.components[ch]);
			return _GP.components[ch] || false;
		}

		// debug('getGlyph - returning FALSE\n');
		return false;
	}

	function getGlyphName(ch) {
		ch = ''+ch;
		// debug('\n getGlyphName');
		// debug('\t passed ' + ch);

		// not passed an id
		if(!ch){
			// debug('\t not passed an ID, returning false');
			return false;
		}

		// known unicode names
		var un = getUnicodeName(ch);
		if(un !== '[name not found]'){
			// debug('\t got unicode name: ' + un);
			return un;
		}

		var cobj = getGlyph(ch);
		if(cobj && cobj.shape) {
			// component
			// debug('\t component - returning ' + cobj.shape.name);
			return cobj.shape.name;
		} else if(ch.indexOf('0x',2) > -1){
			// ligature
			// debug('\t ligature - returning ' + hexToHTML(ch));
			return hexToHTML(ch);
		} else {
			// debug('getGlyphName - inexplicably fails, returning [name not found]\n');
			return '[name not found]';
		}

		// debug(' getGlyphName - returning nothing - END\n');
	}

	function getFirstGlyphID() {
		if(_GP.glyphs['0x0041']) return '0x0041';
		else return getFirstID(_GP.glyphs);
	}

	// GET SELECTED
	function getSelectedGlyph(){
		// debug('\n getSelectedGlyph - START');
		// debug('\t selectedglyph: ' + _UI.selectedglyph);
		var re;
		if(_UI.navhere === 'components') {
			re = getGlyph(_UI.selectedcomponent);
			// debug('\t case components, returning ' + re.glyphname);
			return re;
		} else if (_UI.navhere === 'openproject'){
			return false;
		} else if(_UI.navhere !== 'kerning'){
			re = getGlyph(_UI.selectedglyph, true);
			// debug('\t case glyph edit, returning ' + re.glyphname);
			return re;
		} else {
			return false;
		}
	}

	function getSelectedGlyphID(){
		//debug('GETSELECTEDGLYPHID');
		if(_UI.navhere === 'components') return _UI.selectedcomponent;
		else return _UI.selectedglyph;
	}

	function getSelectedGlyphName() {
		//debug('GETSELECTEDGLYPHNAME - _UI.selectedglyph: ' + _UI.selectedglyph);
		if(_UI.navhere === 'components') return getGlyphName(_UI.selectedcomponent);
		else return getGlyphName(_UI.selectedglyph);
	}

	function getSelectedGlyphShapes(){
		//debug('GETSELECTEDGLYPHSHAPES');
		var rechar = getSelectedGlyph();
		return rechar? rechar.shapes : [];
	}

	function getSelectedGlyphLeftSideBearing(){
		//debug('getSelectedGlyphLeftSideBearing');
		var sc = getSelectedGlyph();
		if(!sc) return 0;
		if(sc.objtype === 'component') return 0;
		if(!sc.isautowide) return 0;
		return sc.leftsidebearing || _GP.projectsettings.defaultlsb;
	}

	function getSelectedGlyphRightSideBearing(){
		//debug('getSelectedGlyphLeftSideBearing');
		var sc = getSelectedGlyph();
		if(!sc) return 0;
		if(sc.objtype === 'component') return 0;
		if(!sc.isautowide) return 0;
		return sc.rightsidebearing || _GP.projectsettings.defaultrsb;
	}

	function selectGlyph(c, dontnavigate){
		//debug('SELECTGLYPH - selecting ' + getGlyph(c, true).glyphname + ' from value ' + c);

		_UI.selectedglyph = c;
		_UI.selectedshape = -1;

		//debug('SELECTGLYPH: shapelayers is now ' + JSON.stringify(getSelectedGlyphShapes()));
		if(!dontnavigate){
			//debug('SELECTGLYPH: selecting ' + _GP.glyphs[c].glyphhtml + ' and navigating.');
			navigate('npAttributes');
		}
	}

	function updateCurrentGlyphWidth() {
		var sc = getSelectedGlyph();
		if(!sc) return;
		if(_UI.navhere === 'glyph edit'){
			sc.calcGlyphMaxes();
		} else if (_UI.navhere === 'components' && sc) {
			var lsarr = sc.usedin;
			if(lsarr) for(var c=0; c<lsarr.length; c++) getGlyph(lsarr[c]).calcGlyphMaxes();
		}
	}

// end of file