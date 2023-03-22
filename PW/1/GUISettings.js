import * as THREE from 'three';
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

// This code is to initialize the GUI and the uniform variables

export let property = {
    uniform: {
        processing_method: {type: 'i', value: 4},   // processing method for filter
        vertical_method: {type: 'i', value:5},      // defines if it requires vertical filtering
        kernel: {type: 'i', value: 3},              // defines the size of kernel size 
        sigma: {type:'f', value: 1.0},              // defines the amount of sigma
        image: { type: "t", value: null },          // variable for input texture
        anaglyph: { type: 'i', value: 2 },          // defines the type of anaglyph you're using
        normalization: { type: 'f', value: 0.02}, 
    },
    v_src: 'San Francisco'
};


export let gui = new GUI();