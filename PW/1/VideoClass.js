import * as THREE from 'three';
import * as anaglyph from './anaglyph.js';
import * as GUISettings from './GUISettings.js';

/*
    This program covers the video generation, processing, and rendering.
    The offscreen rendering is stucture as below.

           videoTexture
                |
          horizontal layer
                |
           vertical layer
                |
           anaglyph layer
                |
               mesh

    - horizontal layer
        Main layer for all the filter function(gaussian, laplasian, etc...).
        For Separable filter, this layer will filter the horizontal direction.

    - vertical layer
        Sub layer for separable filter. This layer will cover the gaussian filter on 
        vertical direction.
        For all the other filters, this will pass the same output as the input.
    
    - anaglyph layer
        Layer for anaglyph effects.
*/

export class VideoClass {
    constructor(scene, document, canvas, context, src){
        this.scene = scene;
        this.document = document;
        this.canvas = canvas;
        this.context = context;
        this.imageProcessing;
        this.videoTexture;
        this.imageProcessingMaterial;

        this.video = this.document.createElement('video');
        this.video.src = src;
        this.video.load();
        this.video.muted = true;
        this.video.loop = true;
        
        // pausePlay function used for GUI pause/play button
        this.pausePlay = function () {
            if (!this.video.paused) {
              console.log("pause");
              this.video.pause();
            } else {
              console.log("play");
              this.video.play();
            }
        }

        // Used for adding 10 second button 
        this.add10sec = function () {
            this.video.currentTime = this.video.currentTime + 10;
            console.log(this.video.currentTime);
        };
        
        this.setGUI();
        
        this.video.onloadeddata = this.LoadedData.bind(this);
        this.video.play();
    }
    
    // This function is used to initialize the video with selected processing methods
    // This will be called everytime when processing method is selected
    // It contains video texture, filtering, and rendering
    LoadedData(){
        console.log('loading video texture')
        this.videoTexture = new THREE.VideoTexture(this.video);
        this.videoTexture.minFilter = THREE.NearestFilter;
        this.videoTexture.magFilter = THREE.NearestFilter;
        this.videoTexture.generateMipmaps = false;
        this.videoTexture.format = THREE.RGBAFormat;

        // setting the values for uniform
        GUISettings.property.uniform.image.value = this.videoTexture;
        console.log(this.videoTexture)        
         
        // offscreen rendering for image processing

        // horizontal filter layer
        this.horizontal_uniforms = {
            image: {value: GUISettings.property.uniform.image.value},
            textureSizew: {type:'f', value:this.video.videoWidth},
            textureSizeh: {type:'f', value:this.video.videoHeight},
            sigma: GUISettings.property.uniform.sigma,
            kernel: GUISettings.property.uniform.kernel,
            horizontal: {type:'f', value:1.0},
            processing_method: GUISettings.property.uniform.processing_method,
            normalization: GUISettings.property.uniform.normalization
        }
        this.horizontal_layer = this.offScreenRendering(anaglyph.filterFrag, this.horizontal_uniforms);

        // vertical filter layer
        this.vertical_uniforms = {
            image: {value: this.horizontal_layer.rtt.texture},
            textureSizew: {type:'f', value:this.video.videoWidth},
            textureSizeh: {type:'f', value:this.video.videoHeight},
            sigma: GUISettings.property.uniform.sigma,
            kernel: GUISettings.property.uniform.kernel,
            horizontal:{type:'f', value:0.0},
            processing_method: GUISettings.property.uniform.vertical_method,
            normalization: GUISettings.property.uniform.normalization
        }

        this.vertical_layer = this.offScreenRendering(anaglyph.filterFrag, this.vertical_uniforms);

        console.log('second filter',this.vertical_layer.rtt.texture)

        // anaglyph layer
        this.anaglyph_uniforms = {
            image: {type:'t', value: this.vertical_layer.rtt.texture},
            right_origin: {type: 'f', value: this.video.videoWidth/2.0},
            anaglyph: GUISettings.property.uniform.anaglyph,
        }
        this.anaglyph_layer = this.offScreenRendering(anaglyph.anaglyphFrag, this.anaglyph_uniforms);
        
        console.log('anaglyph', this.anaglyph_layer.rtt.texture);


        // rendering to plane
        // geometry settings
        var geometry = new THREE.PlaneGeometry(
            1/2,
            this.video.videoHeight / this.video.videoWidth
        );
        // material settings
        var material = new THREE.MeshBasicMaterial({
            map: this.anaglyph_layer.rtt.texture,
            // map: this.videoTexture,
            side: THREE.DoubleSide,
        });

        let plan = new THREE.Mesh(geometry, material);
        plan.name = 'plane'
        plan.receiveShadow = false;
        plan.castShadow = false;
        this.scene.add(plan);
    }

    // Function to check if each filtering layer is not undefined.
    checkIVprocess(renderer){
        if(typeof this.horizontal_layer !== 'undefined'){
            anaglyph.IVprocess(this.horizontal_layer, renderer);
        }
        
        if(typeof this.vertical_layer !== 'undefined'){
            anaglyph.IVprocess(this.vertical_layer, renderer);
        }
        
        if(typeof this.anaglyph_layer !== 'undefined'){
            anaglyph.IVprocess(this.anaglyph_layer, renderer);
        }
    }

    // settings for additional GUI required for this class
    setGUI(){
        GUISettings.gui.add(this, 'pausePlay').name("pause/play video");
        GUISettings.gui.add(this,'add10sec').name("add 10 seconds");

        let sel_anaglyph = {'True':0, 'Gray':1, 'Color':2, 'HalfColor':3, 'Optimized':4, 'Right':5};
        GUISettings.gui.add(GUISettings.property.uniform.anaglyph, 'value', sel_anaglyph).name('type of anaglyph');
        
        
        GUISettings.gui.add(GUISettings.property,'v_src', ['San Francisco', 'Moon']).name('video source').onChange(value => {
            if(value == 'San Francisco'){
               this.video.src = 'San_Francisco.mp4'
            }
            else if(value == 'Moon')
                this.video.src = 'moon.mp4'
            
            this.video.load();
            this.video.play();
        });

        let processing_method = {
            'gaussian': 0,
            'laplasian': 1,
            'Separable filter':2,
            'Denoising':3,
            'Gaussian + Laplacian':4,
            'No filter': 5
        };

        GUISettings.gui.add(GUISettings.property.uniform.processing_method, 'value', processing_method).name('processing method').onChange(value=>{
            if(value == 'Separable filter'){
                GUISettings.property.uniform.vertical_method.value = processing_method['Separable filter'];
            }
            else
                GUISettings.property.uniform.vertical_method.value = processing_method['No filter'];
        });

        GUISettings.gui.add(GUISettings.property.uniform.kernel, 'value', 3, 9, 1).name('kernel');
        GUISettings.gui.add(GUISettings.property.uniform.sigma, 'value').name('sigma');
        GUISettings.gui.add(GUISettings.property.uniform.normalization, 'value').name('normalize');
    }


    //function for creating the offscreen texture
    offScreenRendering(fragment, uniforms){

        // offscreen rendering for image processing
        let imageProcessingMaterial = new THREE.RawShaderMaterial({
            uniforms: uniforms,
            vertexShader: anaglyph.vertexShader,
            fragmentShader: fragment,
            glslVersion: THREE.GLSL3,
        });

        let imageProcessing = new anaglyph.IVimageProcessing(
            this.canvas,
            this.context,
            this.video.videoHeight,
            this.video.videoWidth,
            imageProcessingMaterial
          );

        return imageProcessing;
    }
}