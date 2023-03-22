import * as THREE from 'three';


export const vertexShader = `
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    precision highp float;
    in vec3 position;

    void main() {
        gl_Position = projectionMatrix *
                        modelViewMatrix * vec4(position, 1.0 );
    }`;

export const anaglyphFrag = `
    precision highp float;
    uniform sampler2D image;
    uniform float right_origin;
    uniform int anaglyph;

    out vec4 out_FragColor;

    vec4 TrueAnaglyph(vec4 l_texel, vec4 r_texel){
        mat3 l_mat;
        l_mat[0] = vec3(0.299, 0.587, 0.114);
        l_mat[1] = vec3(0.0, 0.0, 0.0);
        l_mat[2] = vec3(0.0, 0.0, 0.0);
        
        mat3 r_mat;
        r_mat[0] = vec3(0.0, 0.0, 0.0);
        r_mat[1] = vec3(0.0, 0.0, 0.0);
        r_mat[2] = vec3(0.299, 0.587, 0.114);

        return vec4(l_mat*l_texel.xyz+r_mat*r_texel.xyz, 1.0);
    }

    vec4 GrayAnaglyph(vec4 l_texel, vec4 r_texel) {
        mat3 l_mat;
        l_mat[0] = vec3(0.299, 0.0, 0.0);
        l_mat[1] = vec3(0.587, 0.0, 0.0);
        l_mat[2] = vec3(0.114, 0.0, 0.0);
                
        mat3 r_mat;
        r_mat[0] = vec3(0.0, 0.299, 0.299);
        r_mat[1] = vec3(0.0, 0.587, 0.587);
        r_mat[2] = vec3(0.0, 0.114, 0.114);

        return vec4(l_mat*l_texel.xyz+r_mat*r_texel.xyz, 1.0);
    }

    vec4 ColorAnaglyph(vec4 l_texel, vec4 r_texel){
        mat3 l_mat;
        l_mat[0] = vec3(1.0, 0.0, 0.0);
        l_mat[1] = vec3(0.0, 0.0, 0.0);
        l_mat[2] = vec3(0.0, 0.0, 0.0);        
        
        mat3 r_mat;
        r_mat[0] = vec3(0.0, 0.0, 0.0);
        r_mat[1] = vec3(0.0, 1.0, 0.0);
        r_mat[2] = vec3(0.0, 0.0, 1.0);

        return vec4(l_mat*l_texel.xyz+r_mat*r_texel.xyz, 1.0);
    }

    vec4 HalfColorAnaglyph(vec4 l_texel, vec4 r_texel){
        mat3 l_mat;
        l_mat[0] = vec3(0.299, 0.0, 0.0);
        l_mat[1] = vec3(0.587, 0.0, 0.0);
        l_mat[2] = vec3(0.114, 0.0, 0.0);        
        
        mat3 r_mat;
        r_mat[0] = vec3(0.0, 0.0, 0.0);
        r_mat[1] = vec3(0.0, 1.0, 0.0);
        r_mat[2] = vec3(0.0, 0.0, 1.0);

        return vec4(l_mat*l_texel.xyz+r_mat*r_texel.xyz, 1.0);
    }

    vec4 OptimizedAnaglyph(vec4 l_texel, vec4 r_texel){
        mat3 l_mat;
        l_mat[0] = vec3(0.0, 0.0, 0.0);
        l_mat[1] = vec3(0.7, 0.0, 0.0);
        l_mat[2] = vec3(0.3, 0.0, 0.0);        
        
        mat3 r_mat;
        r_mat[0] = vec3(0.0, 0.0, 0.0);
        r_mat[1] = vec3(0.0, 1.0, 0.0);
        r_mat[2] = vec3(0.0, 0.0, 1.0);

        return vec4(l_mat*l_texel.xyz+r_mat*r_texel.xyz, 1.0);
    }

    void main(void){
        
        vec4 left = texelFetch( image, ivec2(gl_FragCoord.x/2.0, gl_FragCoord.y), 0 );
        vec4 right = texelFetch( image, ivec2(gl_FragCoord.x/2.0+right_origin, gl_FragCoord.y), 0 );
        
        switch(anaglyph){
            case 0:
                out_FragColor = TrueAnaglyph(left, right);
                break;
            case 1:
                out_FragColor = GrayAnaglyph(left, right);
                break;
            case 2:
                out_FragColor = ColorAnaglyph(left, right);
                break;         
            case 3:
                out_FragColor = HalfColorAnaglyph(left, right);
                break;         
            case 4:
                out_FragColor = OptimizedAnaglyph(left, right);
                break;       
            case 5:
                out_FragColor = right;
                break;  
                               
        }        
    }
`;

export const filterFrag = `
    precision highp float;

    uniform sampler2D image;
    uniform float textureSizew;
    uniform float textureSizeh;
    uniform float sigma;
    uniform int kernel;
    uniform int processing_method;
    uniform float normalization;
    uniform float horizontal;

    out vec4 out_FragColor;

    // filter functions
    vec4 GaussianFilter(){
        vec4 filtered_texel;

        filtered_texel = vec4(0.0, 0.0, 0.0, 0.0);

        float A = 1.0/(2.0*3.1415926*sigma*sigma);
        float sum_weight = 0.0;

        for(float w=float(-kernel/2); w<float(kernel/2); w+=1.0){
            for(float h=float(-kernel/2); h<float(kernel/2); h+=1.0){
                float gaussian = A*exp(-(w*w+h*h)/(2.0*sigma*sigma));
                sum_weight += gaussian;

                if(gl_FragCoord.x+w >= 0.0 && gl_FragCoord.y+h >= 0.0 && 
                    gl_FragCoord.x+w < textureSizew && gl_FragCoord.y+h < textureSizeh){

                    filtered_texel += texelFetch( image, ivec2(gl_FragCoord.x+w, gl_FragCoord.y+h), 0 )*gaussian;
                }
            } 
        }

        filtered_texel /= sum_weight;

        return filtered_texel;
    }

    vec4 LaplacianFilter(){
        vec4 filtered_texel;
        filtered_texel = vec4(0.0, 0.0, 0.0, 0.0);

        mat3 laplacian;
        laplacian[0] = vec3(-1,-1,-1);
        laplacian[1] = vec3(-1, 8,-1);
        laplacian[2] = vec3(-1,-1,-1);

        for(float w=0.0; w<3.0; w+=1.0){
            for(float h=0.0; h<3.0; h+=1.0){
                if(gl_FragCoord.x+w >= 0.0 && gl_FragCoord.y+h >= 0.0 && 
                    gl_FragCoord.x+w < textureSizew && gl_FragCoord.y+h < textureSizeh){

                    filtered_texel += texelFetch( image, ivec2(gl_FragCoord.x+w, gl_FragCoord.y+h), 0 )*laplacian[int(w)][int(h)];
                }
            }
        }
        
        return filtered_texel;
    }

    vec4 SeparatableGaussianFilter(){
        vec4 filtered_texel;

        filtered_texel = vec4(0.0, 0.0, 0.0, 0.0);

        float A = 1.0/(sqrt(2.0*3.1415926)*sigma);
        float sum_weight = 0.0;

        for(float w=float(-kernel/2); w<float(kernel/2); w+=1.0){
            for(float h=float(-kernel/2); h<float(kernel/2); h+=1.0){
                float gaussian = A*exp(-(w*w*horizontal + h*h*(1.0-horizontal))/(2.0*sigma*sigma));

                sum_weight += gaussian;

                if(gl_FragCoord.x+w >= 0.0 && gl_FragCoord.y+h >= 0.0 && 
                    gl_FragCoord.x+w < textureSizew && gl_FragCoord.y+h < textureSizeh){
                    
                    filtered_texel += texelFetch( image, ivec2(gl_FragCoord.x+w, gl_FragCoord.y+h), 0 )*gaussian;
                }
            } 
        }

        filtered_texel /= sum_weight;

        return filtered_texel;
    }

    vec4 MedianFilter(){
        vec4 filtered_texel;
        
        vec4 texel[81];

        int idx = 0;

        for(int w=-kernel/2; w<kernel; w++){
            for(int h=-kernel/2; h<kernel/2; h++){

                if(gl_FragCoord.x+float(w) >= float(kernel)/2.0 && gl_FragCoord.y+float(h) >= float(kernel)/2.0 && 
                    gl_FragCoord.x+float(w) < textureSizew-float(kernel)/2.0 && gl_FragCoord.y+float(h) < textureSizeh-float(kernel)/2.0){
                    vec4 t = texelFetch( image, ivec2(gl_FragCoord.x+float(w), gl_FragCoord.y+float(h)), 0 );
                    texel[idx] = t;
                    idx+=1;
                }
            } 
        }

        for(int i = 0; i<kernel*kernel-1; i++) {
            for(int j = i+1; j < kernel*kernel; j++) {
                vec4 tmp1 = max(texel[i], texel[j]);
                vec4 tmp2 = min(texel[i], texel[j]);
                texel[i] = tmp1;
                texel[j] = tmp2;
            }
        }
        
        filtered_texel = texel[kernel*kernel/2];
        return filtered_texel;
    }

    vec4 LoGFilter(){
        
        vec4 filtered_texel;

        filtered_texel = vec4(0.0, 0.0, 0.0, 0.0);

        float A = -1.0/(3.1415926*pow(sigma,4.0));
        float sum_weight = 0.0;

        for(float w=float(-kernel/2); w<float(kernel/2); w+=1.0){
            for(float h=float(-kernel/2); h<float(kernel/2); h+=1.0){
                
                if(gl_FragCoord.x+w >= 0.0 && gl_FragCoord.y+h >= 0.0 && 
                    gl_FragCoord.x+w < textureSizew && gl_FragCoord.y+h < textureSizeh){

                    float LoG = A * (1.0-(w*w+h*h)/(2.0*pow(sigma,2.0))) * exp(-(w*w+h*h)/(2.0*pow(sigma,2.0)));
                    sum_weight += LoG;
                    filtered_texel += texelFetch( image, ivec2(gl_FragCoord.x+w, gl_FragCoord.y+h), 0 )*LoG;
                }
            } 
        }

        filtered_texel /= normalization;
        return filtered_texel;
    }

    void main(void){

        switch(processing_method){
            case 0:
                out_FragColor = GaussianFilter();
                break;
            case 1:
                out_FragColor = LaplacianFilter();
                break;
            case 2:
                out_FragColor = SeparatableGaussianFilter();
                break;
            case 3:
                out_FragColor = MedianFilter();
                break;
            case 4:
                out_FragColor = LoGFilter();
                break;
            case 5:
                out_FragColor = texelFetch( image, ivec2(gl_FragCoord.x, gl_FragCoord.y), 0 );
        }
    }
`;


export function IVimageProcessing(canvas, context, height, width, imageProcessingMaterial) {
    this.height = height;
    this.width = width;

    //3 rtt setup
    this.scene = new THREE.Scene();
    this.orthoCamera = new THREE.OrthographicCamera(
        -1,
        1,
        1,
        -1,
        1 / Math.pow(2, 53),
        1
    );

    //4 create a target texture
    var options = {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        //            type:THREE.UnsignedByteType,
        canvas: canvas,
        context: context,
    };
    this.rtt = new THREE.WebGLRenderTarget(width, height, options);

    var geom = new THREE.BufferGeometry();
    geom.setAttribute(
        "position",
        new THREE.BufferAttribute(
            new Float32Array([
            -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
            ]),
            3
        )
    );

    this.mesh = new THREE.Mesh(geom, imageProcessingMaterial);
    this.scene.add(this.mesh);
}


export function IVprocess(imageProcessing, renderer) {
    renderer.setRenderTarget(imageProcessing.rtt);
    renderer.render(imageProcessing.scene, imageProcessing.orthoCamera);
    renderer.setRenderTarget(null);
}