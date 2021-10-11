/**
 * Get browser fingerprint
 *
 * How to use:
 * Add obfuscated code dumpDD.min.js to your web page,
 * then execute the following code to get browser fingerprint,
 * and finally upload to your server for collection.
 *
 * <script>
 *     const dd = await window['__$dd']();
 *     $.ajax({
 *         url: '/api/dd'
 *         , type: 'POST'
 *         , contentType: 'application/json'
 *         , data: dd
 *         , success: function (data) {
 *             window.localStorage.__dd = 1;
 *         },
 *  });
 * </script>
 *
 *
 * @returns {Promise<string>}
 */
window['__$dd'] = async function () {
    // device descriptor
    const dd = {
        plugins: {},
        allFonts: [],
        gpu: {},
        navigator: {},
        window: {},
        document: {},
        screen: {},
        body: {},
        webgl: {},
        mediaCanPlayTypes: [],
        mediaDevices: [],
        defaultCS: {},
        battery: {},
    };

    // plugins
    try {
        dd.plugins.mimeTypes = [];
        const mimeTypes = navigator.mimeTypes;
        for (let n = 0; n < mimeTypes.length; ++n) {
            const mimeType = mimeTypes[n];

            dd.plugins.mimeTypes.push({
                'type': mimeType.type,
                'suffixes': mimeType.suffixes,
                'description': mimeType.description,
                '__pluginName': mimeType.enabledPlugin.name,
            });
        }

        dd.plugins.plugins = [];
        const plugins = navigator.plugins;
        for (let n = 0; n < plugins.length; ++n) {
            const plugin = plugins[n];
            const __mimeTypes = [];

            for (let m = 0; m < plugin.length; ++m) {
                __mimeTypes.push(plugin[m].type);
            }

            dd.plugins.plugins.push({
                'name': plugin.name,
                'filename': plugin.filename,
                'description': plugin.description,
                '__mimeTypes': __mimeTypes,
            });
        }
    } catch (_) {
    }

    // allFonts
    function dumpAllFonts() {
        // Test fonts, there are many fonts and will run for a while here.
        const extraFonts = ['Trebuchet MS', 'Wingdings', 'Sylfaen', 'Segoe UI', 'Constantia', 'SimSun-ExtB', 'MT Extra', 'Gulim',
            'Leelawadee', 'Tunga', 'Meiryo', 'Vrinda', 'CordiaUPC', 'Aparajita', 'IrisUPC', 'Palatino', 'Colonna MT',
            'Playbill', 'Jokerman', 'Parchment', 'MS Outlook', 'Tw Cen MT', 'OPTIMA', 'Futura', 'AVENIR',
            'Arial Hebrew', 'Savoye LET', 'Castellar', 'MYRIAD PRO', 'Andale Mono', 'Arial Narrow',
            'Arial Unicode MS', 'Batang', 'Bell MT', 'Brush Script', 'Brush Script MT', 'Calibri',
            'Charter', 'Courier', 'Courier New', 'Curlz MT', 'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif Condensed',
            'Droid Sans', 'Droid Sans Fallback', 'Droid Serif', 'Forte', 'Geneva', 'Hei', 'Levenim MT', 'Liberation Sans', 'Liberation Sans Narrow',
            'Marlett', 'Meiryo UI', 'Microsoft Uighur', 'Microsoft YaHei UI', 'MS Mincho', 'MS UI Gothic', 'NanumGothic', 'Nirmala UI', 'Papyrus', 'PMingLiU',
            'PT Serif', 'SimHei', 'STIXVariants', 'STSong', 'Traditional Arabic', 'Urdu Typesetting', 'Verdana', 'Wingdings 3', 'Helkevtrica',
            'Al Bayan', 'Al Nile', 'Al Tarikh', 'American Typewriter', 'Apple Braille', 'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo',
            'Apple Symbols', 'AppleGothic', 'AppleMyungjo', 'Arial Black', 'Arial Rounded MT Bold', 'Arial', 'Avenir Next Condensed', 'Avenir Next',
            'Avenir', 'Ayuthaya', 'Baghdad', 'Bangla MN', 'Bangla Sangam MN', 'Baskerville', 'Beirut', 'Big Caslon', 'Bodoni Ornaments', 'Bradley Hand',
            'Chalkboard SE', 'Chalkboard', 'Chalkduster', 'Cochin', 'Comic Sans MS', 'Copperplate', 'Corsiva Hebrew', 'Damascus', 'DecoType Naskh',
            'Devanagari MT', 'Devanagari Sangam MN', 'Didot', 'Diwan Kufi', 'Diwan Thuluth', 'Euphemia UCAS', 'Farah', 'Farisi', 'GB18030 Bitmap',
            'Geeza Pro', 'Georgia', 'Gill Sans', 'Gujarati MT', 'Gujarati Sangam MN', 'Gurmukhi MN', 'Gurmukhi MT', 'Gurmukhi Sangam MN', 'Heiti SC',
            'Helvetica Neue', 'Helvetica', 'Herculanum', 'Hiragino Sans GB', 'Hiragino Sans', 'Hoefler Text', 'ITF Devanagari', 'Impact', 'InaiMathi',
            'Kannada MN', 'Kefa', 'Khmer MN', 'Khmer Sangam MN', 'Kohinoor Bangla', 'Kohinoor Telugu', 'Kokonor', 'Krungthep',
            'KufiStandardGK', 'Lao MN', 'Lao Sangam MN', 'Lucida Grande', 'Luminari', 'Marker Felt', 'Menlo', 'Microsoft Sans Serif', 'Mishafi Gold',
            'Monaco', 'Mshtakan', 'Muna', 'Nadeem', 'New Peninim MT', 'Noteworthy', 'Optima', 'Oriya Sangam MN', 'PT Mono', 'PT Sans Caption',
            'PT Sans Narrow', 'PT Sans', 'PT Serif Caption', 'Phosphate', 'PingFang HK', 'Plantagenet Cherokee', 'Raanana', 'STIXGeneral', 'STIXIntegralsD',
            'STIXIntegralsSm', 'STIXIntegralsUp', 'STIXIntegralsUpD', 'STIXIntegralsUpSm', 'STIXSizeFiveSym', 'STIXSizeFourSym', 'STIXSizeOneSym',
            'STIXSizeThreeSym', 'STIXSizeTwoSym', 'Sana', 'Sathu', 'SignPainter', 'Silom',
            'Sinhala Sangam MN', 'Skia', 'Snell Roundhand', 'Songti SC', 'Sukhumvit Set', 'Symbol', 'Tahoma', 'Tamil Sangam MN', 'Telugu Sangam MN',
            'Thonburi', 'Trattatello', 'Waseem', 'Zapfino', 'DIN Alternate', 'DIN Condensed', 'Noto Nastaliq Urdu', 'Rockwell', 'Zapf Dingbats',
            'BlinkMacSystemFont', 'Mishafi', 'Myanmar MN', 'Myanmar Sangam MN', 'Oriya MN', 'Songti TC', 'Tamil MN', 'Telugu MN', 'Webdings',
            'Cambria Math', 'Cambria', 'Candara', 'Consolas', 'Corbel', 'Ebrima', 'Franklin Gothic', 'Gabriola', 'Lucida Console', 'Lucida Sans Unicode',
            'MS Gothic', 'MS PGothic', 'MV Boli', 'Malgun Gothic', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue',
            'Microsoft PhagsPa', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Mongolian Baiti', 'PMingLiU-ExtB', 'Palatino Linotype',
            'Segoe Print', 'Segoe Script', 'Segoe UI Symbol', 'SimSun', 'Gadugi', 'Javanese Text', 'Microsoft JhengHei UI', 'Myanmar Text',
            'Sitka Small', 'Sitka Text', 'Sitka Subheading', 'Sitka Heading', 'Sitka Display', 'Sitka Banner', 'Yu Gothic',
            'Microsoft Tai Le', 'MingLiU_HKSCS-ExtB', 'Segoe UI Emoji', 'Bahnschrift', 'Abyssinica SIL', 'Liberation Mono', 'Liberation Serif',
            'Lohit Tamil', 'Padauk', 'Waree', 'DejaVu Serif', 'Lohit Kannada', 'Samyak Devanagari', 'OpenSymbol', 'Nakula', 'Chandas', 'Keraleeyam',
            'Mukti Narrow', 'Meera', 'Nimbus Roman', 'Kalimati', 'KacstQurn', 'Gubbi', 'Tibetan Machine Uni', 'Umpush', 'Purisa', 'Pothana2000',
            'Noto Serif CJK JP', 'Norasi', 'Loma', 'Karumbi', 'mry_KacstQurn', 'Noto Serif CJK SC', 'Likhan', 'RaghuMalayalamSans', 'Padauk Book',
            'Phetsarath OT', 'Sawasdee', 'Sahadeva', 'Nimbus Sans', 'Tlwg Typist', 'Noto Sans Mono CJK SC', 'Manjari', 'Ubuntu', 'Chilanka',
            'FreeSerif', 'Nimbus Mono PS', 'Lohit Assamese', 'AnjaliOldLipi', 'Samyak Gujarati', 'Nimbus Sans Narrow', 'Kinnari', 'KacstOne',
            'Mitra Mono', 'Kalapi', 'Laksaman', 'padmaa', 'Ani', 'Rachana', 'Pagul', 'Lohit Telugu', 'Samanata', 'Vemana2000', 'Lohit Gujarati',
            'KacstDecorative', 'Lohit Malayalam', 'Noto Sans CJK HK', 'FreeSans', 'Sarai', 'Lohit Devanagari', 'Noto Color Emoji', 'Uroob',
            'Noto Mono', 'Dyuthi', 'Suruma', 'Jamrul', 'Saab', 'Navilu', 'Gargi', 'Garuda', 'Rekha', 'Lohit Gurmukhi', 'FreeMono', 'KacstScreen',
            'KacstTitle', 'KacstFarsi', 'Tlwg Typo', 'KacstNaskh', 'KacstPoster', 'Noto Sans CJK KR', 'LKLUG', 'KacstPen', 'Tlwg Mono', 'Lohit Odia',
            'KacstOffice', 'ori1Uni', 'Samyak Tamil', 'Noto Sans Mono CJK JP', 'Tlwg Typewriter', 'KacstTitleL', 'KacstDigital', 'KacstLetter', 'KacstBook',
            'Sans', 'sans-serif', 'serif', 'monospace', 'Arial MT', 'Bitstream Vera Sans Mono', 'Book Antiqua', 'Bookman Old Style', 'Century',
            'Century Gothic', 'Century Schoolbook', 'Comic Sans', 'Lucida Bright', 'Lucida Calligraphy', 'Lucida Fax', 'LUCIDA GRANDE',
            'Lucida Handwriting', 'Lucida Sans', 'Lucida Sans Typewriter', 'Monotype Corsiva', 'MS Reference Sans Serif', 'MS Sans Serif',
            'MS Serif', 'MYRIAD', 'Segoe UI Light', 'Segoe UI Semibold', 'Times', 'Times New Roman', 'Times New Roman PS', 'Wingdings 2',
            'Abadi MT Condensed Light', 'Academy Engraved LET', 'ADOBE CASLON PRO', 'Adobe Garamond', 'ADOBE GARAMOND PRO', 'Agency FB', 'Aharoni',
            'Albertus Extra Bold', 'Albertus Medium', 'Algerian', 'Amazone BT', 'American Typewriter Condensed', 'AmerType Md BT', 'Andalus',
            'Angsana New', 'AngsanaUPC', 'Antique Olive', 'Arabic Typesetting', 'ARCHER', 'ARNO PRO', 'Arrus BT', 'Aurora Cn BT', 'AvantGarde Bk BT',
            'AvantGarde Md BT', 'Bandy', 'Bank Gothic', 'BankGothic Md BT', 'Baskerville Old Face', 'BatangChe', 'Bauer Bodoni', 'Bauhaus 93',
            'Bazooka', 'Bembo', 'Benguiat Bk BT', 'Berlin Sans FB', 'Berlin Sans FB Demi', 'Bernard MT Condensed', 'BernhardFashion BT',
            'BernhardMod BT', 'BinnerD', 'Blackadder ITC', 'BlairMdITC TT', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 'Bodoni MT',
            'Bodoni MT Black', 'Bodoni MT Condensed', 'Bodoni MT Poster Compressed', 'Bookshelf Symbol 7', 'Boulder', 'Bradley Hand ITC',
            'Bremen Bd BT', 'Britannic Bold', 'Broadway', 'Browallia New', 'BrowalliaUPC', 'Californian FB', 'Calisto MT', 'Calligrapher',
            'CaslonOpnface BT', 'Centaur', 'Cezanne', 'CG Omega', 'CG Times', 'Charlesworth', 'Charter Bd BT', 'Charter BT', 'Chaucer',
            'ChelthmITC Bk BT', 'Chiller', 'Clarendon', 'Clarendon Condensed', 'CloisterBlack BT', 'Cooper Black', 'Copperplate Gothic',
            'Copperplate Gothic Bold', 'Copperplate Gothic Light', 'CopperplGoth Bd BT', 'Cordia New', 'Cornerstone', 'Coronet', 'Cuckoo',
            'DaunPenh', 'Dauphin', 'David', 'DB LCD Temp', 'DELICIOUS', 'Denmark', 'DFKai-SB', 'DilleniaUPC', 'DIN', 'DokChampa', 'Dotum',
            'DotumChe', 'Edwardian Script ITC', 'Elephant', 'English 111 Vivace BT', 'Engravers MT', 'EngraversGothic BT', 'Eras Bold ITC',
            'Eras Demi ITC', 'Eras Light ITC', 'Eras Medium ITC', 'EucrosiaUPC', 'Euphemia', 'EUROSTILE', 'Exotc350 Bd BT', 'FangSong',
            'Felix Titling', 'Fixedsys', 'FONTIN', 'Footlight MT Light', 'FrankRuehl', 'Fransiscan', 'Freefrm721 Blk BT', 'FreesiaUPC',
            'Freestyle Script', 'French Script MT', 'FrnkGothITC Bk BT', 'Fruitger', 'FRUTIGER', 'Futura Bk BT', 'Futura Lt BT', 'Futura Md BT',
            'Futura ZBlk BT', 'FuturaBlack BT', 'Galliard BT', 'Gautami', 'Geometr231 BT', 'Geometr231 Hv BT', 'Geometr231 Lt BT',
            'GeoSlab 703 Lt BT', 'GeoSlab 703 XBd BT', 'Gigi', 'Gill Sans MT', 'Gill Sans MT Condensed', 'Gill Sans MT Ext Condensed Bold',
            'Gill Sans Ultra Bold', 'Gill Sans Ultra Bold Condensed', 'Gisha', 'Gloucester MT Extra Condensed', 'GOTHAM', 'GOTHAM BOLD',
            'Goudy Old Style', 'Goudy Stout', 'GoudyHandtooled BT', 'GoudyOLSt BT', 'GulimChe', 'Gungsuh', 'GungsuhChe', 'Haettenschweiler',
            'Harlow Solid Italic', 'Harrington', 'Heather', 'Heiti TC', 'HELV', 'Herald', 'High Tower Text', 'Hiragino Kaku Gothic ProN',
            'Hiragino Mincho ProN', 'Humanst 521 Cn BT', 'Humanst521 BT', 'Humanst521 Lt BT', 'Imprint MT Shadow', 'Incised901 Bd BT',
            'Incised901 BT', 'Incised901 Lt BT', 'INCONSOLATA', 'Informal Roman', 'Informal011 BT', 'INTERSTATE', 'Iskoola Pota', 'JasmineUPC',
            'Jazz LET', 'Jenson', 'Jester', 'Juice ITC', 'Kabel Bk BT', 'Kabel Ult BT', 'Kailasa', 'KaiTi', 'Kalinga', 'Kannada Sangam MN',
            'Kartika', 'Kaufmann Bd BT', 'Kaufmann BT', 'Khmer UI', 'KodchiangUPC', 'Kokila', 'Korinna BT', 'Kristen ITC', 'Kunstler Script',
            'Lao UI', 'Latha', 'Letter Gothic', 'LilyUPC', 'Lithograph', 'Lithograph Light', 'Long Island', 'Lydian BT', 'Magneto', 'Maiandra GD',
            'Malayalam Sangam MN', 'Mangal', 'Marigold', 'Marion', 'Market', 'Matisse ITC', 'Matura MT Script Capitals', 'MingLiU', 'MingLiU_HKSCS',
            'Minion', 'Minion Pro', 'Miriam', 'Miriam Fixed', 'Mistral', 'Modern', 'Modern No. 20', 'Mona Lisa Solid ITC TT', 'MONO', 'MoolBoran', 'Mrs Eaves', 'MS LineDraw', 'MS PMincho', 'MS Reference Specialty', 'MUSEO', 'Narkisim', 'NEVIS', 'News Gothic', 'News GothicMT', 'NewsGoth BT', 'Niagara Engraved', 'Niagara Solid', 'NSimSun', 'Nyala', 'OCR A Extended', 'Old Century', 'Old English Text MT', 'Onyx', 'Onyx BT', 'OSAKA', 'OzHandicraft BT', 'Palace Script MT', 'Party LET', 'Pegasus', 'Perpetua', 'Perpetua Titling MT', 'PetitaBold', 'Pickwick', 'Poor Richard', 'Poster', 'PosterBodoni BT', 'PRINCETOWN LET', 'Pristina', 'PTBarnum BT', 'Pythagoras', 'Raavi', 'Rage Italic', 'Ravie', 'Ribbon131 Bd BT', 'Rockwell Condensed', 'Rockwell Extra Bold', 'Rod', 'Roman', 'Sakkal Majalla', 'Santa Fe LET', 'Sceptre', 'Script', 'Script MT Bold', 'SCRIPTINA', 'Serifa', 'Serifa BT', 'Serifa Th BT', 'ShelleyVolante BT', 'Sherwood', 'Shonar Bangla', 'Showcard Gothic', 'Shruti', 'Signboard', 'SILKSCREEN', 'Simplified Arabic', 'Simplified Arabic Fixed', 'Sketch Rockwell', 'Small Fonts', 'Snap ITC', 'Socket', 'Souvenir Lt BT', 'Staccato222 BT', 'Steamer', 'Stencil', 'Storybook', 'Styllo', 'Subway', 'Swis721 BlkEx BT', 'Swiss911 XCm BT', 'Synchro LET', 'System', 'Technical', 'Teletype', 'Tempus Sans ITC', 'Terminal', 'Trajan', 'TRAJAN PRO', 'Tristan', 'Tubular', 'Tw Cen MT Condensed', 'Tw Cen MT Condensed Extra Bold', 'TypoUpright BT', 'Unicorn', 'Univers', 'Univers CE 55 Medium', 'Univers Condensed', 'Utsaah', 'Vagabond', 'Vani', 'Vijaya', 'Viner Hand ITC', 'VisualUI', 'Vivaldi', 'Vladimir Script', 'Westminster', 'WHITNEY', 'Wide Latin', 'ZapfEllipt BT', 'ZapfHumnst BT', 'ZapfHumnst Dm BT', 'Zurich BlkEx BT', 'Zurich Ex BT', 'ZWAdobeF', 'ABeeZee', 'Abel', 'Abhaya Libre', 'Abril Fatface', 'Aclonica', 'Acme', 'Actor', 'Adamina', 'Advent Pro', 'Aguafina Script', 'Akronim', 'Aladin', 'Aldrich', 'Alef', 'Alegreya', 'Alegreya SC', 'Alegreya Sans', 'Alegreya Sans SC', 'Aleo', 'Alex Brush', 'Alfa Slab One', 'Alice', 'Alike', 'Alike Angular', 'Allan', 'Allerta', 'Allerta Stencil', 'Allura', 'Almarai', 'Almendra', 'Almendra Display', 'Almendra SC', 'Amarante', 'Amaranth', 'Amatic SC', 'Amethysta', 'Amiko', 'Amiri', 'Amita', 'Anaheim', 'Andada', 'Andika', 'Angkor', 'Annie Use Your Telescope', 'Anonymous Pro', 'Antic', 'Antic Didone', 'Antic Slab', 'Anton', 'Arapey', 'Arbutus', 'Arbutus Slab', 'Architects Daughter', 'Archivo', 'Archivo Black', 'Archivo Narrow', 'Aref Ruqaa', 'Arima Madurai', 'Arimo', 'Arizonia', 'Armata', 'Arsenal', 'Artifika', 'Arvo', 'Arya', 'Asap', 'Asap Condensed', 'Asar', 'Asset', 'Assistant', 'Astloch', 'Asul', 'Athiti', 'Atma', 'Atomic Age', 'Aubrey', 'Audiowide', 'Autour One', 'Average', 'Average Sans', 'Averia Gruesa Libre', 'Averia Libre', 'Averia Sans Libre', 'Averia Serif Libre', 'B612', 'B612 Mono', 'Bad Script', 'Bahiana', 'Bahianita', 'Bai Jamjuree', 'Baloo', 'Baloo Bhai', 'Baloo Bhaijaan', 'Baloo Bhaina', 'Baloo Chettan', 'Baloo Da', 'Baloo Paaji', 'Baloo Tamma', 'Baloo Tammudu', 'Baloo Thambi', 'Balthazar', 'Bangers', 'Barlow', 'Barlow Condensed', 'Barlow Semi Condensed', 'Barriecito', 'Barrio', 'Basic', 'Battambang', 'Baumans', 'Bayon', 'Be Vietnam', 'Bebas Neue', 'Belgrano', 'Bellefair', 'Belleza', 'BenchNine', 'Bentham', 'Berkshire Swash', 'Beth Ellen', 'Bevan', 'Big Shoulders Display', 'Big Shoulders Text', 'Bigelow Rules', 'Bigshot One', 'Bilbo', 'Bilbo Swash Caps', 'BioRhyme', 'BioRhyme Expanded', 'Biryani', 'Bitter', 'Black And White Picture', 'Black Han Sans', 'Black Ops One', 'Blinker', 'Bokor', 'Bonbon', 'Boogaloo', 'Bowlby One', 'Bowlby One SC', 'Brawler', 'Bree Serif', 'Bubblegum Sans', 'Bubbler One', 'Buda', 'Buenard', 'Bungee', 'Bungee Hairline', 'Bungee Inline', 'Bungee Outline', 'Bungee Shade', 'Butcherman', 'Butterfly Kids', 'Cabin', 'Cabin Condensed', 'Cabin Sketch', 'Caesar Dressing', 'Cagliostro', 'Cairo', 'Calligraffitti', 'Cambay', 'Cambo', 'Candal', 'Cantarell', 'Cantata One', 'Cantora One', 'Capriola', 'Cardo', 'Carme', 'Carrois Gothic', 'Carrois Gothic SC', 'Carter One', 'Catamaran', 'Caudex', 'Caveat', 'Caveat Brush', 'Cedarville Cursive', 'Ceviche One', 'Chakra Petch', 'Changa', 'Changa One', 'Chango', 'Charm', 'Charmonman', 'Chathura', 'Chau Philomene One', 'Chela One', 'Chelsea Market', 'Chenla', 'Cherry Cream Soda', 'Cherry Swash', 'Chewy', 'Chicle', 'Chivo', 'Chonburi', 'Cinzel', 'Cinzel Decorative', 'Clicker Script', 'Coda', 'Coda Caption', 'Codystar', 'Coiny', 'Combo', 'Comfortaa', 'Coming Soon', 'Concert One', 'Condiment', 'Content', 'Contrail One', 'Convergence', 'Cookie', 'Copse', 'Corben', 'Cormorant', 'Cormorant Garamond', 'Cormorant Infant', 'Cormorant SC', 'Cormorant Unicase', 'Cormorant Upright', 'Courgette', 'Cousine', 'Coustard', 'Covered By Your Grace', 'Crafty Girls', 'Creepster', 'Crete Round', 'Crimson Pro', 'Crimson Text', 'Croissant One', 'Crushed', 'Cuprum', 'Cute Font', 'Cutive', 'Cutive Mono', 'DM Sans', 'DM Serif Display', 'DM Serif Text', 'Damion', 'Dancing Script', 'Dangrek', 'Darker Grotesque', 'David Libre', 'Dawning of a New Day', 'Days One', 'Dekko', 'Delius', 'Delius Swash Caps', 'Delius Unicase', 'Della Respira', 'Denk One', 'Devonshire', 'Dhurjati', 'Didact Gothic', 'Diplomata', 'Diplomata SC', 'Do Hyeon', 'Dokdo', 'Domine', 'Donegal One', 'Doppio One', 'Dorsa', 'Dosis', 'Dr Sugiyama', 'Duru Sans', 'Dynalight', 'EB Garamond', 'Eagle Lake', 'East Sea Dokdo', 'Eater', 'Economica', 'Eczar', 'El Messiri', 'Electrolize', 'Elsie', 'Elsie Swash Caps', 'Emblema One', 'Emilys Candy', 'Encode Sans', 'Encode Sans Condensed', 'Encode Sans Expanded', 'Encode Sans Semi Condensed', 'Encode Sans Semi Expanded', 'Engagement', 'Englebert', 'Enriqueta', 'Erica One', 'Esteban', 'Euphoria Script', 'Ewert', 'Exo', 'Exo 2', 'Expletus Sans', 'Fahkwang', 'Fanwood Text', 'Farro', 'Farsan', 'Fascinate', 'Fascinate Inline', 'Faster One', 'Fasthand', 'Fauna One', 'Faustina', 'Federant', 'Federo', 'Felipa', 'Fenix', 'Finger Paint', 'Fira Code', 'Fira Mono', 'Fira Sans', 'Fira Sans Condensed', 'Fira Sans Extra Condensed', 'Fjalla One', 'Fjord One', 'Flamenco', 'Flavors', 'Fondamento', 'Fontdiner Swanky', 'Forum', 'Francois One', 'Frank Ruhl Libre', 'Freckle Face', 'Fredericka the Great', 'Fredoka One', 'Freehand', 'Fresca', 'Frijole', 'Fruktur', 'Fugaz One', 'GFS Didot', 'GFS Neohellenic', 'Gabriela', 'Gaegu', 'Gafata', 'Galada', 'Galdeano', 'Galindo', 'Gamja Flower', 'Gayathri', 'Gentium Basic', 'Gentium Book Basic', 'Geo', 'Geostar', 'Geostar Fill', 'Germania One', 'Gidugu', 'Gilda Display', 'Give You Glory', 'Glass Antiqua', 'Glegoo', 'Gloria Hallelujah', 'Goblin One', 'Gochi Hand', 'Gorditas', 'Gothic A1', 'Goudy Bookletter 1911', 'Graduate', 'Grand Hotel', 'Gravitas One', 'Great Vibes', 'Grenze', 'Griffy', 'Gruppo', 'Gudea', 'Gugi', 'Gurajada', 'Habibi', 'Halant', 'Hammersmith One', 'Hanalei', 'Hanalei Fill', 'Handlee', 'Hanuman', 'Happy Monkey', 'Harmattan', 'Headland One', 'Heebo', 'Henny Penny', 'Hepta Slab', 'Herr Von Muellerhoff', 'Hi Melody', 'Hind', 'Hind Guntur', 'Hind Madurai', 'Hind Siliguri', 'Hind Vadodara', 'Holtwood One SC', 'Homemade Apple', 'Homenaje', 'IBM Plex Mono', 'IBM Plex Sans', 'IBM Plex Sans Condensed', 'IBM Plex Serif', 'IM Fell DW Pica', 'IM Fell DW Pica SC', 'IM Fell Double Pica', 'IM Fell Double Pica SC', 'IM Fell English', 'IM Fell English SC', 'IM Fell French Canon', 'IM Fell French Canon SC', 'IM Fell Great Primer', 'IM Fell Great Primer SC', 'Iceberg', 'Iceland', 'Imprima', 'Inconsolata', 'Inder', 'Indie Flower', 'Inika', 'Inknut Antiqua', 'Irish Grover', 'Istok Web', 'Italiana', 'Italianno', 'Itim', 'Jacques Francois', 'Jacques Francois Shadow', 'Jaldi', 'Jim Nightshade', 'Jockey One', 'Jolly Lodger', 'Jomhuria', 'Jomolhari', 'Josefin Sans', 'Josefin Slab', 'Joti One', 'Jua', 'Judson', 'Julee', 'Julius Sans One', 'Junge', 'Jura', 'Just Another Hand', 'Just Me Again Down Here', 'K2D', 'Kadwa', 'Kalam', 'Kameron', 'Kanit', 'Kantumruy', 'Karla', 'Karma', 'Katibeh', 'Kaushan Script', 'Kavivanar', 'Kavoon', 'Kdam Thmor', 'Keania One', 'Kelly Slab', 'Kenia', 'Khand', 'Khmer', 'Khula', 'Kirang Haerang', 'Kite One', 'Knewave', 'KoHo', 'Kodchasan', 'Kosugi', 'Kosugi Maru', 'Kotta One', 'Koulen', 'Kranky', 'Kreon', 'Kristi', 'Krona One', 'Krub', 'Kulim Park', 'Kumar One', 'Kumar One Outline', 'Kurale', 'La Belle Aurore', 'Lacquer', 'Laila', 'Lakki Reddy', 'Lalezar', 'Lancelot', 'Lateef', 'Lato', 'League Script', 'Leckerli One', 'Ledger', 'Lekton', 'Lemon', 'Lemonada', 'Lexend Deca', 'Lexend Exa', 'Lexend Giga', 'Lexend Mega', 'Lexend Peta', 'Lexend Tera', 'Lexend Zetta', 'Libre Barcode 128', 'Libre Barcode 128 Text', 'Libre Barcode 39', 'Libre Barcode 39 Extended', 'Libre Barcode 39 Extended Text', 'Libre Barcode 39 Text', 'Libre Baskerville', 'Libre Caslon Display', 'Libre Caslon Text', 'Libre Franklin', 'Life Savers', 'Lilita One', 'Lily Script One', 'Limelight', 'Linden Hill', 'Literata', 'Liu Jian Mao Cao', 'Livvic', 'Lobster', 'Lobster Two', 'Londrina Outline', 'Londrina Shadow', 'Londrina Sketch', 'Londrina Solid', 'Long Cang', 'Lora', 'Love Ya Like A Sister', 'Loved by the King', 'Lovers Quarrel', 'Luckiest Guy', 'Lusitana', 'Lustria', 'M PLUS 1p', 'M PLUS Rounded 1c', 'Ma Shan Zheng', 'Macondo', 'Macondo Swash Caps', 'Mada', 'Magra', 'Maiden Orange', 'Maitree', 'Major Mono Display', 'Mako', 'Mali', 'Mallanna', 'Mandali', 'Mansalva', 'Manuale', 'Marcellus', 'Marcellus SC', 'Marck Script', 'Margarine', 'Markazi Text', 'Marko One', 'Marmelad', 'Martel', 'Martel Sans', 'Marvel', 'Mate', 'Mate SC', 'Material Icons', 'Maven Pro', 'McLaren', 'Meddon', 'MedievalSharp', 'Medula One', 'Meera Inimai', 'Megrim', 'Meie Script', 'Merienda', 'Merienda One', 'Merriweather', 'Merriweather Sans', 'Metal', 'Metal Mania', 'Metamorphous', 'Metrophobic', 'Michroma', 'Milonga', 'Miltonian', 'Miltonian Tattoo', 'Mina', 'Miniver', 'Miriam Libre', 'Mirza', 'Miss Fajardose', 'Mitr', 'Modak', 'Modern Antiqua', 'Mogra', 'Molengo', 'Molle', 'Monda', 'Monofett', 'Monoton', 'Monsieur La Doulaise', 'Montaga', 'Montez', 'Montserrat', 'Montserrat Alternates', 'Montserrat Subrayada', 'Moul', 'Moulpali', 'Mountains of Christmas', 'Mouse Memoirs', 'Mr Bedfort', 'Mr Dafoe', 'Mr De Haviland', 'Mrs Saint Delafield', 'Mrs Sheppards', 'Mukta', 'Mukta Mahee', 'Mukta Malar', 'Mukta Vaani', 'Muli', 'Mystery Quest', 'NTR', 'Nanum Brush Script', 'Nanum Gothic', 'Nanum Gothic Coding', 'Nanum Myeongjo', 'Nanum Pen Script', 'Neucha', 'Neuton', 'New Rocker', 'News Cycle', 'Niconne', 'Niramit', 'Nixie One', 'Nobile', 'Nokora', 'Norican', 'Nosifer', 'Notable', 'Nothing You Could Do', 'Noticia Text', 'Noto Sans', 'Noto Sans HK', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC', 'Noto Sans TC', 'Noto Serif', 'Noto Serif JP', 'Noto Serif KR', 'Noto Serif SC', 'Noto Serif TC', 'Nova Cut', 'Nova Flat', 'Nova Mono', 'Nova Oval', 'Nova Round', 'Nova Script', 'Nova Slim', 'Nova Square', 'Numans', 'Nunito', 'Nunito Sans', 'Odor Mean Chey', 'Offside', 'Old Standard TT', 'Oldenburg', 'Oleo Script', 'Oleo Script Swash Caps', 'Open Sans', 'Open Sans Condensed', 'Oranienbaum', 'Orbitron', 'Oregano', 'Orienta', 'Original Surfer', 'Oswald', 'Over the Rainbow', 'Overlock', 'Overlock SC', 'Overpass', 'Overpass Mono', 'Ovo', 'Oxygen', 'Oxygen Mono', 'Pacifico', 'Palanquin', 'Palanquin Dark', 'Pangolin', 'Paprika', 'Parisienne', 'Passero One', 'Passion One', 'Pathway Gothic One', 'Patrick Hand', 'Patrick Hand SC', 'Pattaya', 'Patua One', 'Pavanam', 'Paytone One', 'Peddana', 'Peralta', 'Permanent Marker', 'Petit Formal Script', 'Petrona', 'Philosopher', 'Piedra', 'Pinyon Script', 'Pirata One', 'Plaster', 'Play', 'Playball', 'Playfair Display', 'Playfair Display SC', 'Podkova', 'Poiret One', 'Poller One', 'Poly', 'Pompiere', 'Pontano Sans', 'Poor Story', 'Poppins', 'Port Lligat Sans', 'Port Lligat Slab', 'Pragati Narrow', 'Prata', 'Preahvihear', 'Press Start 2P', 'Pridi', 'Princess Sofia', 'Prociono', 'Prompt', 'Prosto One', 'Proza Libre', 'Public Sans', 'Puritan', 'Purple Purse', 'Quando', 'Quantico', 'Quattrocento', 'Quattrocento Sans', 'Questrial', 'Quicksand', 'Quintessential', 'Qwigley', 'Racing Sans One', 'Radley', 'Rajdhani', 'Rakkas', 'Raleway', 'Raleway Dots', 'Ramabhadra', 'Ramaraja', 'Rambla', 'Rammetto One', 'Ranchers', 'Rancho', 'Ranga', 'Rasa', 'Rationale', 'Ravi Prakash', 'Red Hat Display', 'Red Hat Text', 'Redressed', 'Reem Kufi', 'Reenie Beanie', 'Revalia', 'Rhodium Libre', 'Ribeye', 'Ribeye Marrow', 'Righteous', 'Risque', 'Roboto', 'Roboto Condensed', 'Roboto Mono', 'Roboto Slab', 'Rochester', 'Rock Salt', 'Rokkitt', 'Romanesco', 'Ropa Sans', 'Rosario', 'Rosarivo', 'Rouge Script', 'Rozha One', 'Rubik', 'Rubik Mono One', 'Ruda', 'Rufina', 'Ruge Boogie', 'Ruluko', 'Rum Raisin', 'Ruslan Display', 'Russo One', 'Ruthie', 'Rye', 'Sacramento', 'Sahitya', 'Sail', 'Saira', 'Saira Condensed', 'Saira Extra Condensed', 'Saira Semi Condensed', 'Saira Stencil One', 'Salsa', 'Sanchez', 'Sancreek', 'Sansita', 'Sarabun', 'Sarala', 'Sarina', 'Sarpanch', 'Satisfy', 'Sawarabi Gothic', 'Sawarabi Mincho', 'Scada', 'Scheherazade', 'Schoolbell', 'Scope One', 'Seaweed Script', 'Secular One', 'Sedgwick Ave', 'Sedgwick Ave Display', 'Sevillana', 'Seymour One', 'Shadows Into Light', 'Shadows Into Light Two', 'Shanti', 'Share', 'Share Tech', 'Share Tech Mono', 'Shojumaru', 'Short Stack', 'Shrikhand', 'Siemreap', 'Sigmar One', 'Signika', 'Signika Negative', 'Simonetta', 'Single Day', 'Sintony', 'Sirin Stencil', 'Six Caps', 'Skranji', 'Slabo 13px', 'Slabo 27px', 'Slackey', 'Smokum', 'Smythe', 'Sniglet', 'Snippet', 'Snowburst One', 'Sofadi One', 'Sofia', 'Song Myung', 'Sonsie One', 'Sorts Mill Goudy', 'Source Code Pro', 'Source Sans Pro', 'Source Serif Pro', 'Space Mono', 'Special Elite', 'Spectral', 'Spectral SC', 'Spicy Rice', 'Spinnaker', 'Spirax', 'Squada One', 'Sree Krushnadevaraya', 'Sriracha', 'Srisakdi', 'Staatliches', 'Stalemate', 'Stalinist One', 'Stardos Stencil', 'Stint Ultra Condensed', 'Stint Ultra Expanded', 'Stoke', 'Strait', 'Stylish', 'Sue Ellen Francisco', 'Suez One', 'Sumana', 'Sunflower', 'Sunshiney', 'Supermercado One', 'Sura', 'Suranna', 'Suravaram', 'Suwannaphum', 'Swanky and Moo Moo', 'Syncopate', 'Tajawal', 'Tangerine', 'Taprom', 'Tauri', 'Taviraj', 'Teko', 'Telex', 'Tenali Ramakrishna', 'Tenor Sans', 'Text Me One', 'Thasadith', 'The Girl Next Door', 'Tienne', 'Tillana', 'Timmana', 'Tinos', 'Titan One', 'Titillium Web', 'Tomorrow', 'Trade Winds', 'Trirong', 'Trocchi', 'Trochut', 'Trykker', 'Tulpen One', 'Turret Road', 'Ubuntu Condensed', 'Ubuntu Mono', 'Ultra', 'Uncial Antiqua', 'Underdog', 'Unica One', 'UnifrakturCook', 'UnifrakturMaguntia', 'Unkempt', 'Unlock', 'Unna', 'VT323', 'Vampiro One', 'Varela', 'Varela Round', 'Vast Shadow', 'Vesper Libre', 'Vibes', 'Vibur', 'Vidaloka', 'Viga', 'Voces', 'Volkhov', 'Vollkorn', 'Vollkorn SC', 'Voltaire', 'Waiting for the Sunrise', 'Wallpoet', 'Walter Turncoat', 'Warnes', 'Wellfleet', 'Wendy One', 'Wire One', 'Work Sans', 'Yanone Kaffeesatz', 'Yantramanav', 'Yatra One', 'Yellowtail', 'Yeon Sung', 'Yeseva One', 'Yesteryear', 'Yrsa', 'ZCOOL KuaiLe', 'ZCOOL QingKe HuangYou', 'ZCOOL XiaoWei', 'Zeyada', 'Zhi Mang Xing', 'Zilla Slab', 'Zilla Slab Highlight', 'Noto Naskh Arabic', 'Noto Sans Armenian', 'Noto Sans Bengali', 'Noto Sans Buginese', 'Noto Sans Canadian Aboriginal', 'Noto Sans Cherokee', 'Noto Sans Devanagari', 'Noto Sans Ethiopic', 'Noto Sans Georgian', 'Noto Sans Gujarati', 'Noto Sans Gurmukhi', 'Noto Sans Hebrew', 'Noto Sans JP Regular', 'Noto Sans KR Regular', 'Noto Sans Kannada', 'Noto Sans Khmer', 'Noto Sans Lao', 'Noto Sans Malayalam', 'Noto Sans Mongolian', 'Noto Sans Myanmar', 'Noto Sans Oriya', 'Noto Sans SC Regular', 'Noto Sans Sinhala', 'Noto Sans TC Regular', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Thaana', 'Noto Sans Thai', 'Noto Sans Tibetan', 'Noto Sans Yi', 'Noto Serif Armenian', 'Noto Serif Khmer', 'Noto Serif Lao', 'Noto Serif Thai', 'Aqua Kana', 'Aqua Kana Bold', 'Helvetica LT MM', 'Helvetica Neue Desk UI', 'Helvetica Neue Desk UI Bold', 'Helvetica Neue Desk UI Bold Italic', 'Helvetica Neue Desk UI Italic', 'Helvetica Neue DeskInterface', 'Times LT MM', 'AR PL UKai CN', 'AR PL UKai HK', 'AR PL UKai TW', 'AR PL UKai TW MBE', 'AR PL UMing CN', 'AR PL UMing HK', 'AR PL UMing TW', 'AR PL UMing TW MBE', 'Aharoni Bold', 'Aharoni CLM', 'Al Bayan Bold', 'Al Bayan Plain', 'Al Nile Bold', 'Al Tarikh Regular', 'AlArabiya', 'AlBattar', 'AlHor', 'AlManzomah', 'AlYarmook', 'Aldhabi', 'AlternateGothic2 BT', 'American Typewriter Bold', 'American Typewriter Condensed Bold', 'American Typewriter Condensed Light', 'American Typewriter Light', 'American Typewriter Semibold', 'Amiri Quran', 'Amiri Quran Colored', 'Angsana New Bold', 'Angsana New Bold Italic', 'Angsana New Italic', 'AngsanaUPC Bold', 'AngsanaUPC Bold Italic', 'AngsanaUPC Italic', 'Aparajita Bold', 'Aparajita Bold Italic', 'Aparajita Italic', 'Apple Braille Outline 6 Dot', 'Apple Braille Outline 8 Dot', 'Apple Braille Pinpoint 6 Dot', 'Apple Braille Pinpoint 8 Dot', 'Apple LiGothic Medium', 'Apple LiSung Light', 'Apple SD Gothic Neo Bold', 'Apple SD Gothic Neo Heavy', 'Apple SD Gothic Neo Light', 'Apple SD Gothic Neo Medium', 'Apple SD Gothic Neo Regular', 'Apple SD Gothic Neo SemiBold', 'Apple SD Gothic Neo Thin', 'Apple SD Gothic Neo UltraLight', 'Apple SD GothicNeo ExtraBold', 'AppleGothic Regular', 'AppleMyungjo Regular', 'Arab', 'Arial Bold', 'Arial Bold Italic', 'Arial Hebrew Bold', 'Arial Hebrew Light', 'Arial Hebrew Scholar', 'Arial Hebrew Scholar Bold', 'Arial Hebrew Scholar Light', 'Arial Italic', 'Arial Narrow Bold', 'Arial Narrow Bold Italic', 'Arial Narrow Italic', 'Arial Nova', 'Arial Nova Bold', 'Arial Nova Bold Italic', 'Arial Nova Cond', 'Arial Nova Cond Bold', 'Arial Nova Cond Bold Italic', 'Arial Nova Cond Italic', 'Arial Nova Cond Light', 'Arial Nova Cond Light Italic', 'Arial Nova Italic', 'Arial Nova Light', 'Arial Nova Light Italic', 'Athelas Bold', 'Athelas Bold Italic', 'Athelas Italic', 'Athelas Regular', 'Avenir Black', 'Avenir Black Oblique', 'Avenir Book', 'Avenir Book Oblique', 'Avenir Heavy', 'Avenir Heavy Oblique', 'Avenir Light', 'Avenir Light Oblique', 'Avenir Medium', 'Avenir Medium Oblique', 'Avenir Next Bold', 'Avenir Next Bold Italic', 'Avenir Next Condensed Bold', 'Avenir Next Condensed Bold Italic', 'Avenir Next Condensed Demi Bold', 'Avenir Next Condensed Demi Bold Italic', 'Avenir Next Condensed Heavy', 'Avenir Next Condensed Heavy Italic', 'Avenir Next Condensed Italic', 'Avenir Next Condensed Medium', 'Avenir Next Condensed Medium Italic', 'Avenir Next Condensed Regular', 'Avenir Next Condensed Ultra Light', 'Avenir Next Condensed Ultra Light Italic', 'Avenir Next Demi Bold', 'Avenir Next Demi Bold Italic', 'Avenir Next Heavy', 'Avenir Next Heavy Italic', 'Avenir Next Italic', 'Avenir Next Medium', 'Avenir Next Medium Italic', 'Avenir Next Regular', 'Avenir Next Ultra Light', 'Avenir Next Ultra Light Italic', 'Avenir Oblique', 'Avenir Roman', 'BIZ UDGothic', 'BIZ UDGothic Bold', 'BIZ UDMincho', 'BIZ UDMincho Medium', 'BIZ UDPGothic', 'BIZ UDPGothic Bold', 'BIZ UDPMincho', 'BIZ UDPMincho Medium', 'Baghdad Regular', 'Bahnschrift Light', 'Bahnschrift SemiBold', 'Bahnschrift SemiLight', 'Bangla MN Bold', 'Bangla Sangam MN Bold', 'Baoli SC Regular', 'Baoli TC Regular', 'Baskerville Bold', 'Baskerville Bold Italic', 'Baskerville Italic', 'Baskerville SemiBold', 'Baskerville SemiBold Italic', 'Beirut Regular', 'BiauKai', 'Big Caslon Medium', 'Bitstream Charter', 'Bodoni 72 Bold', 'Bodoni 72 Book', 'Bodoni 72 Book Italic', 'Bodoni 72 Oldstyle Bold', 'Bodoni 72 Oldstyle Book', 'Bodoni 72 Oldstyle Book Italic', 'Bodoni 72 Smallcaps Book', 'Bradley Hand Bold', 'Browallia New Bold', 'Browallia New Bold Italic', 'Browallia New Italic', 'BrowalliaUPC Bold', 'BrowalliaUPC Bold Italic', 'BrowalliaUPC Italic', 'Brush Script MT Italic', 'C059', 'Caladea', 'Caladings CLM', 'Calibri Bold', 'Calibri Bold Italic', 'Calibri Italic', 'Calibri Light', 'Calibri Light Italic', 'Cambria Bold', 'Cambria Bold Italic', 'Cambria Italic', 'Candara Bold', 'Candara Bold Italic', 'Candara Italic', 'Candara Light', 'Candara Light Italic', 'Cantarell Extra Bold', 'Cantarell Light', 'Cantarell Thin', 'Carlito', 'Century Schoolbook L', 'Chalkboard Bold', 'Chalkboard SE Bold', 'Chalkboard SE Light', 'Chalkboard SE Regular', 'Charcoal CY', 'Charter Black', 'Charter Black Italic', 'Charter Bold', 'Charter Bold Italic', 'Charter Italic', 'Charter Roman', 'Cochin Bold', 'Cochin Bold Italic', 'Cochin Italic', 'Comfortaa Light', 'Comic Sans MS Bold', 'Comic Sans MS Bold Italic', 'Comic Sans MS Italic', 'Consolas Bold', 'Consolas Bold Italic', 'Consolas Italic', 'Constantia Bold', 'Constantia Bold Italic', 'Constantia Italic', 'Copperplate Bold', 'Copperplate Light', 'Corbel Bold', 'Corbel Bold Italic', 'Corbel Italic', 'Corbel Light', 'Corbel Light Italic', 'Cordia New Bold', 'Cordia New Bold Italic', 'Cordia New Italic', 'CordiaUPC Bold', 'CordiaUPC Bold Italic', 'CordiaUPC Italic', 'Corsiva Hebrew Bold', 'Cortoba', 'Courier 10 Pitch', 'Courier Bold', 'Courier Bold Oblique', 'Courier New Bold', 'Courier New Bold Italic', 'Courier New Italic', 'Courier Oblique', 'D050000L', 'DIN Alternate Bold', 'DIN Condensed Bold', 'Damascus Bold', 'Damascus Light', 'Damascus Medium', 'Damascus Regular', 'Damascus Semi Bold', 'David Bold', 'David CLM', 'DecoType Naskh Regular', 'DejaVu Math TeX Gyre', 'DejaVu Sans Condensed', 'DejaVu Sans Light', 'DengXian', 'DengXian Bold', 'DengXian Light', 'Devanagari MT Bold', 'Devanagari Sangam MN Bold', 'Didot Bold', 'Didot Italic', 'DilleniaUPC Bold', 'DilleniaUPC Bold Italic', 'DilleniaUPC Italic', 'Dimnah', 'Dingbats', 'Diwan Kufi Regular', 'Diwan Mishafi', 'Diwan Thuluth Regular', 'Droid Arabic Kufi', 'Droid Sans Armenian', 'Droid Sans Devanagari', 'Droid Sans Ethiopic', 'Droid Sans Georgian', 'Droid Sans Hebrew', 'Droid Sans Japanese', 'Droid Sans Mono', 'Droid Sans Tamil', 'Droid Sans Thai', 'Drugulin CLM', 'Ebrima Bold', 'Electron', 'Ellinia CLM', 'EmojiOne Mozilla', 'Estrangelo Edessa', 'EucrosiaUPC Bold', 'EucrosiaUPC Bold Italic', 'EucrosiaUPC Italic', 'Euphemia UCAS Bold', 'Euphemia UCAS Italic', 'Ezra SIL', 'Ezra SIL SR', 'Farah Regular', 'Farisi Regular', 'Frank Ruehl CLM', 'Franklin Gothic Medium', 'Franklin Gothic Medium Italic', 'FreesiaUPC Bold', 'FreesiaUPC Bold Italic', 'FreesiaUPC Italic', 'Furat', 'Futura Bold', 'Futura Condensed ExtraBold', 'Futura Condensed Medium', 'Futura Medium', 'Futura Medium Italic', 'Gadugi Bold', 'Gautami Bold', 'Gayathri Thin', 'Geeza Pro Bold', 'Geeza Pro Regular', 'Geneva CY', 'Georgia Bold', 'Georgia Bold Italic', 'Georgia Italic', 'Georgia Pro', 'Georgia Pro Black', 'Georgia Pro Black Italic', 'Georgia Pro Bold', 'Georgia Pro Bold Italic', 'Georgia Pro Cond', 'Georgia Pro Cond Black', 'Georgia Pro Cond Black Italic', 'Georgia Pro Cond Bold', 'Georgia Pro Cond Bold Italic', 'Georgia Pro Cond Italic', 'Georgia Pro Cond Light', 'Georgia Pro Cond Light Italic', 'Georgia Pro Cond Semibold', 'Georgia Pro Cond Semibold Italic', 'Georgia Pro Italic', 'Georgia Pro Light', 'Georgia Pro Light Italic', 'Georgia Pro Semibold', 'Georgia Pro Semibold Italic', 'Gill Sans Bold', 'Gill Sans Bold Italic', 'Gill Sans Italic', 'Gill Sans Light', 'Gill Sans Light Italic', 'Gill Sans Nova', 'Gill Sans Nova Bold', 'Gill Sans Nova Bold Italic', 'Gill Sans Nova Cond', 'Gill Sans Nova Cond Bold', 'Gill Sans Nova Cond Bold Italic', 'Gill Sans Nova Cond Italic', 'Gill Sans Nova Cond Lt', 'Gill Sans Nova Cond Lt Italic', 'Gill Sans Nova Cond Ultra Bold', 'Gill Sans Nova Cond XBd', 'Gill Sans Nova Cond XBd Italic', 'Gill Sans Nova Italic', 'Gill Sans Nova Light', 'Gill Sans Nova Light Italic', 'Gill Sans Nova Ultra Bold', 'Gill Sans SemiBold', 'Gill Sans SemiBold Italic', 'Gill Sans UltraBold', 'Gisha Bold', 'Granada', 'Graph', 'Gujarati MT Bold', 'Gujarati Sangam MN Bold', 'GungSeo Regular', 'Gurmukhi MN Bold', 'Gurmukhi Sangam MN Bold', 'Hadasim CLM', 'Hani', 'Hannotate SC Bold', 'Hannotate SC Regular', 'Hannotate TC Bold', 'Hannotate TC Regular', 'HanziPen SC Bold', 'HanziPen SC Regular', 'HanziPen TC Bold', 'HanziPen TC Regular', 'Haramain', 'HeadLineA Regular', 'Hei Regular', 'Heiti SC Light', 'Heiti SC Medium', 'Heiti TC Light', 'Heiti TC Medium', 'Helvetica Bold', 'Helvetica Bold Oblique', 'Helvetica CY Bold', 'Helvetica CY BoldOblique', 'Helvetica CY Oblique', 'Helvetica CY Plain', 'Helvetica Light', 'Helvetica Light Oblique', 'Helvetica Neue Bold', 'Helvetica Neue Bold Italic', 'Helvetica Neue Condensed Black', 'Helvetica Neue Condensed Bold', 'Helvetica Neue Italic', 'Helvetica Neue Light', 'Helvetica Neue Light Italic', 'Helvetica Neue Medium', 'Helvetica Neue Medium Italic', 'Helvetica Neue Thin', 'Helvetica Neue Thin Italic', 'Helvetica Neue UltraLight', 'Helvetica Neue UltraLight Italic', 'Helvetica Oblique', 'Hiragino Kaku Gothic Pro W3', 'Hiragino Kaku Gothic Pro W6', 'Hiragino Kaku Gothic ProN W3', 'Hiragino Kaku Gothic ProN W6', 'Hiragino Kaku Gothic Std W8', 'Hiragino Kaku Gothic StdN W8', 'Hiragino Maru Gothic Pro W4', 'Hiragino Maru Gothic ProN', 'Hiragino Maru Gothic ProN W4', 'Hiragino Mincho Pro W3', 'Hiragino Mincho Pro W6', 'Hiragino Mincho ProN W3', 'Hiragino Mincho ProN W6', 'Hiragino Sans CNS W3', 'Hiragino Sans CNS W6', 'Hiragino Sans GB W3', 'Hiragino Sans GB W6', 'Hiragino Sans W0', 'Hiragino Sans W1', 'Hiragino Sans W2', 'Hiragino Sans W3', 'Hiragino Sans W4', 'Hiragino Sans W5', 'Hiragino Sans W6', 'Hiragino Sans W7', 'Hiragino Sans W8', 'Hiragino Sans W9', 'Hoefler Text Black', 'Hoefler Text Black Italic', 'Hoefler Text Italic', 'Hoefler Text Ornaments', 'HoloLens MDL2 Assets', 'Homa', 'Hor', 'ITF Devanagari Bold', 'ITF Devanagari Book', 'ITF Devanagari Demi', 'ITF Devanagari Light', 'ITF Devanagari Marathi', 'ITF Devanagari Marathi Bold', 'ITF Devanagari Marathi Book', 'ITF Devanagari Marathi Demi', 'ITF Devanagari Marathi Light', 'ITF Devanagari Marathi Medium', 'ITF Devanagari Medium', 'InaiMathi Bold', 'Ink Free', 'Iowan Old Style Black', 'Iowan Old Style Black Italic', 'Iowan Old Style Bold', 'Iowan Old Style Bold Italic', 'Iowan Old Style Italic', 'Iowan Old Style Roman', 'Iowan Old Style Titling', 'IrisUPC Bold', 'IrisUPC Bold Italic', 'IrisUPC Italic', 'Iskoola Pota Bold', 'Japan', 'JasmineUPC Bold', 'JasmineUPC Bold Italic', 'JasmineUPC Italic', 'Jet', 'KacstArt', 'Kai Regular', 'Kailasa Bold', 'Kailasa Regular', 'Kaiti SC Black', 'Kaiti SC Bold', 'Kaiti SC Regular', 'Kaiti TC Black', 'Kaiti TC Bold', 'Kaiti TC Regular', 'Kalinga Bold', 'Kannada MN Bold', 'Kannada Sangam MN Bold', 'Kartika Bold', 'Kayrawan', 'Kefa Bold', 'Kefa Regular', 'Keter YG', 'Keyboard', 'Khalid', 'Khmer MN Bold', 'Khmer OS', 'Khmer OS Battambang', 'Khmer OS Bokor', 'Khmer OS Content', 'Khmer OS Fasthand', 'Khmer OS Freehand', 'Khmer OS Metal Chrieng', 'Khmer OS Muol', 'Khmer OS Muol Light', 'Khmer OS Muol Pali', 'Khmer OS Siemreap', 'Khmer OS System', 'Khmer UI Bold', 'Klee Demibold', 'Klee Medium', 'KodchiangUPC Bold', 'KodchiangUPC Bold Italic', 'KodchiangUPC Italic', 'Kohinoor Bangla Bold', 'Kohinoor Bangla Light', 'Kohinoor Bangla Medium', 'Kohinoor Bangla Semibold', 'Kohinoor Devanagari', 'Kohinoor Devanagari Bold', 'Kohinoor Devanagari Light', 'Kohinoor Devanagari Medium', 'Kohinoor Devanagari Regular', 'Kohinoor Devanagari Semibold', 'Kohinoor Telugu Bold', 'Kohinoor Telugu Light', 'Kohinoor Telugu Medium', 'Kohinoor Telugu Semibold', 'Kokila Bold', 'Kokila Bold Italic', 'Kokila Italic', 'Kokonor Regular', 'KufiStandardGK Regular', 'Lantinghei SC Demibold', 'Lantinghei SC Extralight', 'Lantinghei SC Heavy', 'Lantinghei TC Demibold', 'Lantinghei TC Extralight', 'Lantinghei TC Heavy', 'Lao MN Bold', 'Lao UI Bold', 'LastResort', 'Latha Bold', 'Leelawadee Bold', 'Leelawadee UI', 'Leelawadee UI Bold', 'Leelawadee UI Semilight', 'Levenim MT Bold', 'LiHei Pro', 'LiSong Pro', 'Libian SC Regular', 'Libian TC Regular', 'LilyUPC Bold', 'LilyUPC Bold Italic', 'LilyUPC Italic', 'LingWai SC Medium', 'LingWai TC Medium', 'Lohit Bengali', 'Lohit Tamil Classical', 'Lucida Grande Bold', 'Malayalam MN', 'Malayalam MN Bold', 'Malayalam Sangam MN Bold', 'Malgun Gothic Bold', 'Malgun Gothic Semilight', 'Mangal Bold', 'Manjari Thin', 'Marion Bold', 'Marion Italic', 'Marion Regular', 'Marker Felt Thin', 'Marker Felt Wide', 'Mashq', 'Mashq-Bold', 'Meiryo Bold', 'Meiryo Bold Italic', 'Meiryo Italic', 'Meiryo UI Bold', 'Meiryo UI Bold Italic', 'Meiryo UI Italic', 'Menlo Bold', 'Menlo Bold Italic', 'Menlo Italic', 'Menlo Regular', 'Microsoft JhengHei Bold', 'Microsoft JhengHei Light', 'Microsoft JhengHei Regular', 'Microsoft JhengHei UI Bold', 'Microsoft JhengHei UI Light', 'Microsoft JhengHei UI Regular', 'Microsoft New Tai Lue Bold', 'Microsoft PhagsPa Bold', 'Microsoft Tai Le Bold', 'Microsoft Uighur Bold', 'Microsoft YaHei Bold', 'Microsoft YaHei Light', 'Microsoft YaHei UI Bold', 'Microsoft YaHei UI Light', 'Mingzat', 'Miriam CLM', 'Miriam Mono CLM', 'Mishafi Gold Regular', 'Mishafi Regular', 'Montserrat Black', 'Montserrat ExtraBold', 'Montserrat ExtraLight', 'Montserrat Light', 'Montserrat Medium', 'Montserrat SemiBold', 'Montserrat Thin', 'Mshtakan Bold', 'Mshtakan BoldOblique', 'Mshtakan Oblique', 'Mukti Narrow Bold', 'Muna Black', 'Muna Bold', 'Muna Regular', 'Myanmar MN Bold', 'Myanmar Sangam MN Bold', 'Myanmar Text Bold', 'Myriad Arabic', 'Myriad Arabic Black', 'Myriad Arabic Black Italic', 'Myriad Arabic Bold', 'Myriad Arabic Bold Italic', 'Myriad Arabic Italic', 'Myriad Arabic Light', 'Myriad Arabic Light Italic', 'Myriad Arabic Semibold', 'Myriad Arabic Semibold Italic', 'Nachlieli CLM', 'Nada', 'Nadeem Regular', 'Nagham', 'NanumGothic Bold', 'NanumGothic ExtraBold', 'NanumMyeongjo', 'NanumMyeongjo Bold', 'NanumMyeongjo ExtraBold', 'Nazli', 'Neue Haas Grotesk Text Pro', 'Neue Haas Grotesk Text Pro Bold', 'Neue Haas Grotesk Text Pro Bold Italic', 'Neue Haas Grotesk Text Pro Italic', 'Neue Haas Grotesk Text Pro Medium', 'Neue Haas Grotesk Text Pro Medium Italic', 'New Peninim MT Bold', 'New Peninim MT Bold Inclined', 'New Peninim MT Inclined', 'Nice', 'Nimbus Mono L', 'Nimbus Roman No9 L', 'Nimbus Sans L', 'Nirmala UI Bold', 'Nirmala UI Semilight', 'Noteworthy Bold', 'Noteworthy Light', 'Noto Emoji', 'Noto Kufi Arabic', 'Noto Sans Adlam', 'Noto Sans Adlam Unjoined', 'Noto Sans Anatolian Hieroglyphs', 'Noto Sans Arabic', 'Noto Sans Avestan', 'Noto Sans Balinese', 'Noto Sans Bamum', 'Noto Sans Batak', 'Noto Sans Brahmi', 'Noto Sans Buhid', 'Noto Sans CJK HK Black', 'Noto Sans CJK HK DemiLight', 'Noto Sans CJK HK Light', 'Noto Sans CJK HK Medium', 'Noto Sans CJK HK Thin', 'Noto Sans CJK JP', 'Noto Sans CJK JP Black', 'Noto Sans CJK JP DemiLight', 'Noto Sans CJK JP Light', 'Noto Sans CJK JP Medium', 'Noto Sans CJK JP Thin', 'Noto Sans CJK KR Black', 'Noto Sans CJK KR DemiLight', 'Noto Sans CJK KR Light', 'Noto Sans CJK KR Medium', 'Noto Sans CJK KR Thin', 'Noto Sans CJK SC', 'Noto Sans CJK SC Black', 'Noto Sans CJK SC DemiLight', 'Noto Sans CJK SC Light', 'Noto Sans CJK SC Medium', 'Noto Sans CJK SC Regular', 'Noto Sans CJK SC Thin', 'Noto Sans CJK TC', 'Noto Sans CJK TC Black', 'Noto Sans CJK TC DemiLight', 'Noto Sans CJK TC Light', 'Noto Sans CJK TC Medium', 'Noto Sans CJK TC Thin', 'Noto Sans Carian', 'Noto Sans Chakma', 'Noto Sans Cham', 'Noto Sans Coptic', 'Noto Sans Cuneiform', 'Noto Sans Cypriot', 'Noto Sans Deseret', 'Noto Sans Display', 'Noto Sans Egyptian Hieroglyphs', 'Noto Sans Glagolitic', 'Noto Sans Gothic', 'Noto Sans Hanunoo', 'Noto Sans Imperial Aramaic', 'Noto Sans Inscriptional Pahlavi', 'Noto Sans Inscriptional Parthian', 'Noto Sans Javanese', 'Noto Sans Kaithi', 'Noto Sans Kayah Li', 'Noto Sans Kharoshthi', 'Noto Sans Lepcha', 'Noto Sans Limbu', 'Noto Sans Linear B', 'Noto Sans Lisu', 'Noto Sans Lycian', 'Noto Sans Lydian', 'Noto Sans Mandaic', 'Noto Sans Meetei Mayek', 'Noto Sans Mono', 'Noto Sans Mono CJK HK', 'Noto Sans Mono CJK KR', 'Noto Sans Mono CJK TC', 'Noto Sans NKo', 'Noto Sans New Tai Lue', 'Noto Sans Ogham', 'Noto Sans Ol Chiki', 'Noto Sans Old Italic', 'Noto Sans Old Persian', 'Noto Sans Old South Arabian', 'Noto Sans Old Turkic', 'Noto Sans Osage', 'Noto Sans Osmanya', 'Noto Sans Phags Pa', 'Noto Sans Phoenician', 'Noto Sans Rejang', 'Noto Sans Runic', 'Noto Sans Samaritan', 'Noto Sans Saurashtra', 'Noto Sans Shavian', 'Noto Sans Sundanese', 'Noto Sans Syloti Nagri', 'Noto Sans Symbols', 'Noto Sans Symbols2', 'Noto Sans Syriac Eastern', 'Noto Sans Syriac Estrangela', 'Noto Sans Syriac Western', 'Noto Sans Tagalog', 'Noto Sans Tagbanwa', 'Noto Sans Tai Le', 'Noto Sans Tai Tham', 'Noto Sans Tai Viet', 'Noto Sans Tifinagh', 'Noto Sans Ugaritic', 'Noto Sans Vai', 'Noto Serif Bengali', 'Noto Serif CJK JP Black', 'Noto Serif CJK JP ExtraLight', 'Noto Serif CJK JP Light', 'Noto Serif CJK JP Medium', 'Noto Serif CJK JP SemiBold', 'Noto Serif CJK KR', 'Noto Serif CJK KR Black', 'Noto Serif CJK KR ExtraLight', 'Noto Serif CJK KR Light', 'Noto Serif CJK KR Medium', 'Noto Serif CJK KR SemiBold', 'Noto Serif CJK SC Black', 'Noto Serif CJK SC ExtraLight', 'Noto Serif CJK SC Light', 'Noto Serif CJK SC Medium', 'Noto Serif CJK SC SemiBold', 'Noto Serif CJK TC', 'Noto Serif CJK TC Black', 'Noto Serif CJK TC ExtraLight', 'Noto Serif CJK TC Light', 'Noto Serif CJK TC Medium', 'Noto Serif CJK TC SemiBold', 'Noto Serif Devanagari', 'Noto Serif Display', 'Noto Serif Ethiopic', 'Noto Serif Georgian', 'Noto Serif Gujarati', 'Noto Serif Hebrew', 'Noto Serif Kannada', 'Noto Serif Malayalam', 'Noto Serif Myanmar', 'Noto Serif Sinhala', 'Noto Serif Tamil', 'Noto Serif Telugu', 'Nuosu SIL', 'Optima Bold', 'Optima Bold Italic', 'Optima ExtraBlack', 'Optima Italic', 'Optima Regular', 'Oriya MN Bold', 'Oriya Sangam MN Bold', 'Osaka', 'Osaka-Mono', 'Ostorah', 'Ouhod', 'Ouhod-Bold', 'P052', 'PCMyungjo Regular', 'PT Mono Bold', 'PT Sans Bold', 'PT Sans Bold Italic', 'PT Sans Caption Bold', 'PT Sans Italic', 'PT Sans Narrow Bold', 'PT Serif Bold', 'PT Serif Bold Italic', 'PT Serif Caption Italic', 'PT Serif Italic', 'PakType Naskh Basic', 'Palatino Bold', 'Palatino Bold Italic', 'Palatino Italic', 'Palatino Linotype Bold', 'Palatino Linotype Bold Italic', 'Palatino Linotype Italic', 'Papyrus Condensed', 'Petra', 'Phosphate Inline', 'Phosphate Solid', 'PilGi Regular', 'PingFang HK Light', 'PingFang HK Medium', 'PingFang HK Regular', 'PingFang HK Semibold', 'PingFang HK Thin', 'PingFang HK Ultralight', 'PingFang SC', 'PingFang SC Light', 'PingFang SC Medium', 'PingFang SC Regular', 'PingFang SC Semibold', 'PingFang SC Thin', 'PingFang SC Ultralight', 'PingFang TC', 'PingFang TC Light', 'PingFang TC Medium', 'PingFang TC Regular', 'PingFang TC Semibold', 'PingFang TC Thin', 'PingFang TC Ultralight', 'Raanana Bold', 'Raavi Bold', 'Rasa Light', 'Rasa Medium', 'Rasa SemiBold', 'Rasheeq', 'Rasheeq-Bold', 'Rehan', 'Rockwell Bold', 'Rockwell Bold Italic', 'Rockwell Italic', 'Rockwell Nova', 'Rockwell Nova Bold', 'Rockwell Nova Bold Italic', 'Rockwell Nova Cond', 'Rockwell Nova Cond Bold', 'Rockwell Nova Cond Bold Italic', 'Rockwell Nova Cond Italic', 'Rockwell Nova Cond Light', 'Rockwell Nova Cond Light Italic', 'Rockwell Nova Extra Bold', 'Rockwell Nova Extra Bold Italic', 'Rockwell Nova Italic', 'Rockwell Nova Light Italic', 'Rockwell Nova Rockwell', 'STFangsong', 'STHeiti', 'STIX', 'STIX Math', 'STIX Two Math', 'STIX Two Text', 'STIX Two Text Bold', 'STIX Two Text Bold Italic', 'STIX Two Text Italic', 'STIXGeneral-Bold', 'STIXGeneral-BoldItalic', 'STIXGeneral-Italic', 'STIXGeneral-Regular', 'STIXIntegralsD-Bold', 'STIXIntegralsD-Regular', 'STIXIntegralsSm-Bold', 'STIXIntegralsSm-Regular', 'STIXIntegralsUp-Bold', 'STIXIntegralsUp-Regular', 'STIXIntegralsUpD-Bold', 'STIXIntegralsUpD-Regular', 'STIXIntegralsUpSm-Bold', 'STIXIntegralsUpSm-Regular', 'STIXNonUnicode', 'STIXNonUnicode-Bold', 'STIXNonUnicode-BoldItalic', 'STIXNonUnicode-Italic', 'STIXNonUnicode-Regular', 'STIXSizeFiveSym-Regular', 'STIXSizeFourSym-Bold', 'STIXSizeFourSym-Regular', 'STIXSizeOneSym-Bold', 'STIXSizeOneSym-Regular', 'STIXSizeThreeSym-Bold', 'STIXSizeThreeSym-Regular', 'STIXSizeTwoSym-Bold', 'STIXSizeTwoSym-Regular', 'STIXVariants-Bold', 'STIXVariants-Regular', 'STKaiti', 'STXihei', 'Sakkal Majalla Bold', 'Salem', 'Samyak Malayalam', 'Sana Regular', 'Sanskrit Text', 'Savoye LET Plain CC.:1.0', 'Savoye LET Plain:1.0', 'Segoe MDL2 Assets', 'Segoe Print Bold', 'Segoe Pseudo', 'Segoe Script Bold', 'Segoe UI Black', 'Segoe UI Black Italic', 'Segoe UI Bold', 'Segoe UI Bold Italic', 'Segoe UI Historic', 'Segoe UI Italic', 'Segoe UI Light Italic', 'Segoe UI Semibold Italic', 'Segoe UI Semilight', 'Segoe UI Semilight Italic', 'Seravek', 'Seravek Bold', 'Seravek Bold Italic', 'Seravek ExtraLight', 'Seravek ExtraLight Italic', 'Seravek Italic', 'Seravek Light', 'Seravek Light Italic', 'Seravek Medium', 'Seravek Medium Italic', 'Shado', 'Sharjah', 'Shofar', 'Shonar Bangla Bold', 'Shree Devanagari 714', 'Shree Devanagari 714 Bold', 'Shree Devanagari 714 Bold Italic', 'Shree Devanagari 714 Italic', 'Shruti Bold', 'SignPainter-HouseScript', 'SignPainter-HouseScript Semibold', 'Simple CLM', 'Simplified Arabic Bold', 'Sindbad', 'Sinhala MN', 'Sinhala MN Bold', 'Sinhala Sangam MN Bold', 'Sitka Banner Bold', 'Sitka Banner Bold Italic', 'Sitka Banner Italic', 'Sitka Display Bold', 'Sitka Display Bold Italic', 'Sitka Display Italic', 'Sitka Heading Bold', 'Sitka Heading Bold Italic', 'Sitka Heading Italic', 'Sitka Small Bold', 'Sitka Small Bold Italic', 'Sitka Small Italic', 'Sitka Subheading Bold', 'Sitka Subheading Bold Italic', 'Sitka Subheading Italic', 'Sitka Text Bold', 'Sitka Text Bold Italic', 'Sitka Text Italic', 'Skia Black', 'Skia Black Condensed', 'Skia Black Extended', 'Skia Bold', 'Skia Condensed', 'Skia Extended', 'Skia Light', 'Skia Light Condensed', 'Skia Light Extended', 'Skia Regular', 'Snell Roundhand Black', 'Snell Roundhand Bold', 'Songti SC Black', 'Songti SC Bold', 'Songti SC Light', 'Songti SC Regular', 'Songti TC Bold', 'Songti TC Light', 'Songti TC Regular', 'Source Code Pro Black', 'Source Code Pro ExtraLight', 'Source Code Pro Light', 'Source Code Pro Medium', 'Source Code Pro Semibold', 'Stam Ashkenaz CLM', 'Stam Sefarad CLM', 'Standard Symbols L', 'Standard Symbols PS', 'Sukhumvit Set Bold', 'Sukhumvit Set Light', 'Sukhumvit Set Medium', 'Sukhumvit Set Semi Bold', 'Sukhumvit Set Text', 'Sukhumvit Set Thin', 'Superclarendon Black', 'Superclarendon Black Italic', 'Superclarendon Bold', 'Superclarendon Bold Italic', 'Superclarendon Italic', 'Superclarendon Light', 'Superclarendon Light Italic', 'Superclarendon Regular', 'Symbola', 'System Font Bold', 'System Font Regular', 'Tahoma Bold', 'Tahoma Negreta', 'Tamil MN Bold', 'Tamil Sangam MN Bold', 'Tarablus', 'Telugu MN Bold', 'Telugu Sangam MN Bold', 'Tholoth', 'Thonburi Bold', 'Thonburi Light', 'Times Bold', 'Times Bold Italic', 'Times Italic', 'Times New Roman Bold', 'Times New Roman Bold Italic', 'Times New Roman Italic', 'Times Roman', 'Titr', 'Toppan Bunkyu Gothic Demibold', 'Toppan Bunkyu Gothic Regular', 'Toppan Bunkyu Midashi Gothic Extrabold', 'Toppan Bunkyu Midashi Mincho Extrabold', 'Toppan Bunkyu Mincho Regular', 'Traditional Arabic Bold', 'Trebuchet MS Bold', 'Trebuchet MS Bold Italic', 'Trebuchet MS Italic', 'Tsukushi A Round Gothic Bold', 'Tsukushi A Round Gothic Regular', 'Tsukushi B Round Gothic Bold', 'Tsukushi B Round Gothic Regular', 'Tunga Bold', 'Twemoji Mozilla', 'UD Digi Kyokasho', 'UD Digi Kyokasho N-B', 'UD Digi Kyokasho N-R', 'UD Digi Kyokasho NK-B', 'UD Digi Kyokasho NK-R', 'UD Digi Kyokasho NP-B', 'UD Digi Kyokasho NP-R', 'UKIJ 3D', 'UKIJ Basma', 'UKIJ Bom', 'UKIJ CJK', 'UKIJ Chechek', 'UKIJ Chiwer Kesme', 'UKIJ Diwani', 'UKIJ Diwani Kawak', 'UKIJ Diwani Tom', 'UKIJ Diwani Yantu', 'UKIJ Ekran', 'UKIJ Elipbe', 'UKIJ Elipbe_Chekitlik', 'UKIJ Esliye', 'UKIJ Esliye Chiwer', 'UKIJ Esliye Neqish', 'UKIJ Esliye Qara', 'UKIJ Esliye Tom', 'UKIJ Imaret', 'UKIJ Inchike', 'UKIJ Jelliy', 'UKIJ Junun', 'UKIJ Kawak', 'UKIJ Kawak 3D', 'UKIJ Kesme', 'UKIJ Kesme Tuz', 'UKIJ Kufi', 'UKIJ Kufi 3D', 'UKIJ Kufi Chiwer', 'UKIJ Kufi Gul', 'UKIJ Kufi Kawak', 'UKIJ Kufi Tar', 'UKIJ Kufi Uz', 'UKIJ Kufi Yay', 'UKIJ Kufi Yolluq', 'UKIJ Mejnun', 'UKIJ Mejnuntal', 'UKIJ Merdane', 'UKIJ Moy Qelem', 'UKIJ Nasq', 'UKIJ Nasq Zilwa', 'UKIJ Orqun Basma', 'UKIJ Orqun Yazma', 'UKIJ Orxun-Yensey', 'UKIJ Qara', 'UKIJ Qolyazma', 'UKIJ Qolyazma Tez', 'UKIJ Qolyazma Tuz', 'UKIJ Qolyazma Yantu',
            'UKIJ Ruqi', 'UKIJ Saet', 'UKIJ Sulus', 'UKIJ Sulus Tom', 'UKIJ Teng', 'UKIJ Tiken', 'UKIJ Title', 'UKIJ Tor', 'UKIJ Tughra', 'UKIJ Tuz', 'UKIJ Tuz Basma', 'UKIJ Tuz Gezit', 'UKIJ Tuz Kitab', 'UKIJ Tuz Neqish', 'UKIJ Tuz Qara', 'UKIJ Tuz Tom', 'UKIJ Tuz Tor', 'UKIJ Zilwa', 'UKIJ_Mac Basma', 'UKIJ_Mac Ekran', 'URW Bookman', 'URW Bookman L', 'URW Chancery L', 'URW Gothic', 'URW Gothic L', 'URW Palladio L', 'Ubuntu Light', 'Ubuntu Thin', 'Urdu Typesetting Bold', 'Utsaah Bold', 'Utsaah Bold Italic', 'Utsaah Italic', 'Vani Bold', 'Verdana Bold', 'Verdana Bold Italic', 'Verdana Italic', 'Verdana Pro', 'Verdana Pro Black', 'Verdana Pro Black Italic', 'Verdana Pro Bold', 'Verdana Pro Bold Italic', 'Verdana Pro Cond', 'Verdana Pro Cond Black', 'Verdana Pro Cond Black Italic', 'Verdana Pro Cond Bold', 'Verdana Pro Cond Bold Italic', 'Verdana Pro Cond Italic', 'Verdana Pro Cond Light',
            'Verdana Pro Cond Light Italic', 'Verdana Pro Cond SemiBold', 'Verdana Pro Cond SemiBold Italic', 'Verdana Pro Italic', 'Verdana Pro Light', 'Verdana Pro Light Italic', 'Verdana Pro SemiBold', 'Verdana Pro SemiBold Italic', 'Vijaya Bold', 'Vrinda Bold', 'Waseem Light', 'Waseem Regular', 'Wawati SC Regular', 'Wawati TC Regular', 'Weibei SC Bold', 'Weibei TC Bold',
            'Xingkai SC Bold', 'Xingkai SC Light', 'Xingkai TC Bold', 'Xingkai TC Light', 'Yehuda CLM', 'Yrsa Light', 'Yrsa Medium', 'Yrsa SemiBold', 'Yu Gothic Bold', 'Yu Gothic Light', 'Yu Gothic Medium', 'Yu Gothic Regular', 'Yu Gothic UI', 'Yu Gothic UI Bold', 'Yu Gothic UI Light', 'Yu Gothic UI Regular', 'Yu Gothic UI Semibold', 'Yu Gothic UI Semilight', 'Yu Mincho', 'Yu Mincho Demibold', 'Yu Mincho Light', 'Yu Mincho Regular', 'YuGothic Bold', 'YuGothic Medium', 'YuKyokasho Bold', 'YuKyokasho Medium', 'YuKyokasho Yoko Bold',
            'YuKyokasho Yoko Medium', 'YuMincho +36p Kana Demibold', 'YuMincho +36p Kana Extrabold', 'YuMincho +36p Kana Medium', 'YuMincho Demibold', 'YuMincho Extrabold', 'YuMincho Medium', 'Yuanti SC Bold', 'Yuanti SC Light', 'Yuanti SC Regular',
            'Yuanti TC Bold', 'Yuanti TC Light', 'Yuanti TC Regular', 'Yuppy SC Regular', 'Yuppy TC Regular', 'Z003', 'aakar', 'padmaa-Bold.1.1',
            'padmmaa', 'utkal', 'מרים', 'गार्गी', 'नालिमाटी', 'অনি Dvf', 'মিত্র', 'মুক্তি', 'মুক্তি পাতনা', '宋体', '微软雅黑', `新細明`, `굴림`, `굴림체`, `바탕`, `ＭＳ ゴシック`, `ＭＳ 明朝`, `ＭＳ Ｐゴシック`, `ＭＳ Ｐ明朝`];

        const baseFonts = ['sans-serif', 'serif', 'monospace'];
        const baseWidth = {};
        const baseHeight = {};

        for (let font of baseFonts) {
            const span = document.createElement('span');
            span.innerHTML = 'mmmmmmmmmmlli';
            span.style.fontSize = '72px';
            span.style.fontFamily = font;
            document.body.appendChild(span);
            baseWidth[font] = span.offsetWidth;
            baseHeight[font] = span.offsetHeight;

            dd.allFonts.push({
                name: font,
                exists: 2,
            });

            document.body.removeChild(span);
        }

        for (let n = 0; n < extraFonts.length; n++) {
            const font = extraFonts[n];

            for (const baseFont of baseFonts) {
                const span = document.createElement('span');
                span.innerHTML = 'mmmmmmmmmmlli';
                span.style.fontSize = '72px';
                span.style.fontFamily = extraFonts[n] + ',' + baseFont;
                document.body.appendChild(span);

                const sizeNotTheSame =
                    span.offsetWidth !== baseWidth[baseFont]
                    || span.offsetHeight !== baseHeight[baseFont];

                dd.allFonts.push({
                    name: font,
                    exists: sizeNotTheSame ? 1 : 0,
                });

                document.body.removeChild(span);

                if (sizeNotTheSame) {
                    break;
                }
            }
        }
    }

    dumpAllFonts();

    // gpu
    try {
        const webgl = document.createElement('canvas').getContext('webgl');
        const renderer = webgl.getExtension('WEBGL_debug_renderer_info');

        dd.gpu.vendor = webgl.getParameter(renderer.UNMASKED_VENDOR_WEBGL);
        dd.gpu.renderer = webgl.getParameter(renderer.UNMASKED_RENDERER_WEBGL);
    } catch (_) {
    }

    // props
    function dumpObjProps(obj, keys) {
        const result = {};

        if (obj) {
            for (let n in keys) {
                const key = keys[n];
                const val = obj[key];

                try {
                    if (
                        ('function' == typeof val || 'object' == typeof val)
                        && !(val === null)
                        && !(val instanceof Array)
                    ) {
                        result[key] = '_$obj!_//+_';
                    } else {
                        if ('undefined' == typeof val) {
                            result[key] = '_$obj!_undefined_//+_';
                        } else {
                            result[key] = val;
                        }
                    }
                } catch (_) {
                }
            }
        }

        return result;
    }

    function dumpNavigatorProps() {
        return dumpObjProps(navigator, [
            'languages', 'userAgent', 'appCodeName', 'appMinorVersion', 'appName', 'appVersion', 'buildID',
            'platform', 'product', 'productSub', 'hardwareConcurrency', 'cpuClass', 'maxTouchPoints', 'oscpu',
            'vendor', 'vendorSub', 'deviceMemory', 'doNotTrack', 'msDoNotTrack', 'vibrate', 'credentials',
            'storage', 'requestMediaKeySystemAccess', 'bluetooth', 'language', 'systemLanguage', 'userLanguage',
        ]);
    }

    function dumpWindowProps() {
        return dumpObjProps(window, [
            'innerWidth', 'innerHeight',
            'outerWidth', 'outerHeight',
            'screenX', 'screenY',
            'pageXOffset', 'pageYOffset',
            'Image', 'isSecureContext', 'devicePixelRatio', 'toolbar', 'locationbar', 'ActiveXObject', 'external',
            'mozRTCPeerConnection', 'postMessage', 'webkitRequestAnimationFrame', 'BluetoothUUID', 'netscape',
            'localStorage', 'sessionStorage', 'indexDB',
        ]);
    }

    function dumpScreenProps() {
        return dumpObjProps(screen, [
            'availWidth', 'availHeight',
            'availLeft', 'availTop',
            'width', 'height',
            'colorDepth', 'pixelDepth',
        ]);
    }

    function dumpDocumentProps() {
        return dumpObjProps(document, ['characterSet', 'compatMode', 'documentMode', 'layers', 'images']);
    }

    function dumpBodyProps() {
        return dumpObjProps(document.body, ['clientWidth', 'clientHeight']);
    }

    Object.assign(dd.navigator, dumpNavigatorProps());
    Object.assign(dd.window, dumpWindowProps());
    Object.assign(dd.document, dumpDocumentProps());
    Object.assign(dd.screen, dumpScreenProps());
    Object.assign(dd.body, dumpBodyProps());

    // webgl
    function getWebGLContext() {
        const canvas = document.createElement('canvas');
        let result = null;
        try {
            result = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        } catch (ex) {
        }

        result || (result = null);
        return result;
    }

    const webglContext = getWebGLContext();

    function getMaxAnisotropy(webgl) {
        if (webgl) {
            const ext = webgl.getExtension('EXT_texture_filter_anisotropic') || webgl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || webgl.getExtension('MOZ_EXT_texture_filter_anisotropic');
            if (ext) {
                return webgl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            }
        }

        return null;
    }

    function dumpWebGLProps() {
        if (!webglContext) {
            return {};
        }

        const result = {
            'supportedExtensions': webglContext.getSupportedExtensions() || [],
            'antialias': webglContext.getContextAttributes().antialias,
            'contextAttributes': webglContext.getContextAttributes(),
            'blueBits': webglContext.getParameter(webglContext.BLUE_BITS), // 3412
            'depthBits': webglContext.getParameter(webglContext.DEPTH_BITS), // 3414
            'greenBits': webglContext.getParameter(webglContext.GREEN_BITS), // 3411
            'maxAnisotropy': getMaxAnisotropy(webglContext),
            'maxCombinedTextureImageUnits': webglContext.getParameter(webglContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS), // 35661
            'maxCubeMapTextureSize': webglContext.getParameter(webglContext.MAX_CUBE_MAP_TEXTURE_SIZE), // 34076
            'maxFragmentUniformVectors': webglContext.getParameter(webglContext.MAX_FRAGMENT_UNIFORM_VECTORS), // 36349
            'maxRenderbufferSize': webglContext.getParameter(webglContext.MAX_RENDERBUFFER_SIZE), // 34024
            'maxTextureImageUnits': webglContext.getParameter(webglContext.MAX_TEXTURE_IMAGE_UNITS), // 34930
            'maxTextureSize': webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE), // 3379
            'maxVaryingVectors': webglContext.getParameter(webglContext.MAX_VARYING_VECTORS), // 36348
            'maxVertexAttribs': webglContext.getParameter(webglContext.MAX_VERTEX_ATTRIBS), // 34921
            'maxVertexTextureImageUnits': webglContext.getParameter(webglContext.MAX_VERTEX_TEXTURE_IMAGE_UNITS), // 35660
            'maxVertexUniformVectors': webglContext.getParameter(webglContext.MAX_VERTEX_UNIFORM_VECTORS), // 36347
            'shadingLanguageVersion': webglContext.getParameter(webglContext.SHADING_LANGUAGE_VERSION), // 35724
            'stencilBits': webglContext.getParameter(webglContext.STENCIL_BITS), // 3415
            'version': webglContext.getParameter(webglContext.VERSION), // 7938
            'aliasedLineWidthRange': webglContext.getParameter(webglContext.ALIASED_LINE_WIDTH_RANGE), // 33902
            'aliasedPointSizeRange': webglContext.getParameter(webglContext.ALIASED_POINT_SIZE_RANGE), // 33901
            'maxViewportDims': webglContext.getParameter(webglContext.MAX_VIEWPORT_DIMS), // 3386
            'alphaBits': webglContext.getParameter(webglContext.ALPHA_BITS), // 3413
            'redBits': webglContext.getParameter(webglContext.RED_BITS), // 3410
            'renderer': webglContext.getParameter(webglContext.RENDERER), // 7937
            'vendor': webglContext.getParameter(webglContext.VENDOR), // 7936
            'webgl_37445': webglContext.getParameter(37445), // 37445
            'webgl_37446': webglContext.getParameter(37446), // 37446
            'webgl_34047': webglContext.getParameter(34047), // 34047
        };


        //
        const args = [
            [webglContext.VERTEX_SHADER, webglContext.HIGH_FLOAT],
            [webglContext.VERTEX_SHADER, webglContext.MEDIUM_FLOAT],
            [webglContext.VERTEX_SHADER, webglContext.LOW_FLOAT],
            [webglContext.VERTEX_SHADER, webglContext.HIGH_INT],
            [webglContext.VERTEX_SHADER, webglContext.MEDIUM_INT],
            [webglContext.VERTEX_SHADER, webglContext.LOW_INT],

            [webglContext.FRAGMENT_SHADER, webglContext.HIGH_FLOAT],
            [webglContext.FRAGMENT_SHADER, webglContext.MEDIUM_FLOAT],
            [webglContext.FRAGMENT_SHADER, webglContext.LOW_FLOAT],
            [webglContext.FRAGMENT_SHADER, webglContext.HIGH_INT],
            [webglContext.FRAGMENT_SHADER, webglContext.MEDIUM_INT],
            [webglContext.FRAGMENT_SHADER, webglContext.LOW_INT],
        ];

        result.shaderPrecisionFormats = [];
        for (let arg of args) {
            let [shaderType, precisionType] = arg;
            let r = webglContext.getShaderPrecisionFormat(shaderType, precisionType);

            result.shaderPrecisionFormats.push({
                shaderType,
                precisionType,
                r: {
                    rangeMin: r.rangeMin,
                    rangeMax: r.rangeMax,
                    precision: r.precision,
                },
            });
        }

        return result;
    }

    Object.assign(dd.webgl, dumpWebGLProps());

    // mediaCanPlayTypes
    const mediaTypes = [
        'video/x-m4v; codecs="avc1.42AC23"',
        'audio/x-m4a; codecs="mp3"',
        'audio/ogg; codecs="theora, opus"',
        'audio/aac; codecs="flac"',
        'video/webm; codecs="vp09.02.10.08"',
        'video/mp4; codecs="avc3.42001E"',
        'video/webm',
        'video/mp4; codecs="avc1.42E034"',
        'audio/mpeg; codecs="mp3"',
        'audio/mp3; codecs="vp9"',
        'video/webm; codecs="av01.0.04M.08"',
        'video/mp4; codecs="mp4a.40.02"',
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        'audio/flac',
        'video/ogg; codecs="vp8"',
        'video/mp4; codecs="mp4a.40.29"',
        'video/mp4; codecs="mp4a.67"',
        'video/mp4; codecs="flac"',
        'audio/x-m4a; codecs="vp9, mp4a.40.2"',
        'video/mp4; codecs="avc1.42E009"',
        'video/ogg; codecs="flac"',
        'video/mp4; codecs="mp4a.40.5"',
        'video/mp4; codecs="avc1.123456"',
        'video/mp4; codecs="avc1.42F01E"',
        'video/mp4; codecs="avc1.4D001E"',
        'audio/amr; codecs="hvc1x"',
        'audio/webm; codecs="vp8"',
        'video/x-dv; codecs="avc3.12345"',
        'audio/x-m4a; codecs="vp8, mp4a.40"',
        'video/mp4; codecs="lavc1337"',
        'video/mp4; codecs="avc1x"',
    ];

    for (let n = 0; n < mediaTypes.length; ++n) {
        let mediaType = mediaTypes[n];
        let elem = document.createElement(mediaType.startsWith('video') ? 'video' : 'audio');

        dd.mediaCanPlayTypes.push({mediaType, r: elem.canPlayType(mediaType)});
    }

    // mediaDevices
    try {
        dd.mediaDevices = await navigator.mediaDevices.enumerateDevices();
    } catch (_) {
    }

    // battery
    function getBattery() {
        return new Promise(function (resolve) {
            'getBattery' in navigator ? navigator.getBattery().then(function (battery) {
                resolve({
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime,
                    level: battery.level,
                });
            }) : resolve({});
        });
    }

    dd.battery = await getBattery();

    // TODO: !timezone

    // rtcip
    function dumpRTC() {
        dd.rtc = [];
        let rtcCls = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

        return new Promise(function (resolve) {
            try {
                if (rtcCls) {
                    let rtc = new rtcCls({
                            'iceServers': [{
                                'urls': 'stun:stun.l.google.com:19302',
                            }],
                        }),
                        emptyFunc = function () {
                        },
                        reg1 = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/,
                        reg2 = /^(192\.168\.|169\.254\.|10\.|172\.(1[6-9]|2\d|3[01]))/g;

                    rtc.createDataChannel('');
                    setTimeout(function () {
                        resolve('');
                    }, 500);

                    let offer = rtc.createOffer();

                    offer instanceof Promise ? offer.then(function (e) {
                        return rtc.setLocalDescription(e);
                    }).then(function () {
                    }) : rtc.createOffer(function (e) {
                        rtc.setLocalDescription(e, emptyFunc, emptyFunc);
                    }, emptyFunc);

                    rtc.onicecandidate = function (event) {
                        if (event && event.candidate && event.candidate.candidate) {
                            let regResult = reg1.exec(event.candidate.candidate);
                            dd.rtc.push({
                                candidate: event.candidate.candidate,
                                reg: regResult,
                            });
                            regResult && regResult[0].match(reg2) && resolve(regResult[0]);
                        }
                    };
                } else resolve('');
            } catch (ex) {
                resolve('');
            }
        });
    }

    await dumpRTC();

    // TODO: RTCRtpSender.getCapabilities
    // TODO: window.speechSynthesis.getVoices

    // default ComputedStyle
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const defaultCS = {};
    const cs = frame.contentWindow.getComputedStyle(frame.contentDocument.body);
    for (const key in cs) {
        defaultCS[key] = cs[key];
    }

    frame.remove();
    dd.defaultCS = defaultCS;

    // upload fp
    return JSON.stringify(dd);
};
