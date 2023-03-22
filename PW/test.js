const originalImage = document.getElementById("original-image");

const canvas = document.querySelector("canvas");

const filters = {
  Identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  "Box Blur": [0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111],
  "Gaussian Blur": [
    0.0625,
    0.125,
    0.0625,
    0.125,
    0.25,
    0.125,
    0.0625,
    0.125,
    0.0625
  ],
  Sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  Unsharpen: [-1, -1, -1, -1, 9, -1, -1, -1, -1],
  "Edge Detection": [-1, -1, -1, -1, 8, -1, -1, -1, -1],
  Emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2]
};

let currentSelection = "Identity";

// initializing the filter select HTML element
const select = document.querySelector("#filters");
for (const filter in filters) {
  var option = document.createElement("option");
  option.value = filter;

  if (filter === currentSelection) {
    option.selected = true;
  }

  option.appendChild(document.createTextNode(filter));
  select.appendChild(option);
}

// calling the filterImage function on change
select.onchange = function () {
  currentSelection = this.options[this.selectedIndex].value;
  filterImage(canvas, originalImage, filters[currentSelection]);
};

function filterImage(canvas, originalImage, kernel) {
  // assuming the kernel is a square matrix
  const kernelSize = Math.sqrt(kernel.length);

  const gl = canvas.getContext("webgl");

  // clearing the canvas
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const vertexShaderSource = `
    attribute vec2 position;
    varying vec2 v_coordinate;

    void main() {
        gl_Position = vec4(position, 0, 1);
        v_coordinate = gl_Position.xy * 0.5 + 0.5;
    }
    `;

  const fragmentShaderSource = `
    precision mediump float;
    // the varible defined in the vertex shader above
    varying vec2 v_coordinate;

    uniform vec2 imageSize;
    uniform sampler2D u_texture;
    
    void main() {
        vec2 position = vec2(v_coordinate.x, 1.0 - v_coordinate.y);
        vec2 onePixel = vec2(1, 1) / imageSize;
        vec4 color = vec4(0);
        mat3 kernel = mat3(
        ${kernel.join(",")}
        );

        // implementing the convolution operation
        for(int i = 0; i < ${kernelSize}; i++) {
        for(int j = 0; j < ${kernelSize}; j++) {
            // retrieving the sample position pixel
            vec2 samplePosition = position + vec2(i - 1 , j - 1) * onePixel;
            // retrieving the sample color
            vec4 sampleColor = texture2D(u_texture, samplePosition);
            sampleColor *= kernel[i][j];
            color += sampleColor;
        }
        }
        color.a = 1.0;
        gl_FragColor = color;
    }
    `;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );

  // iniziailing the program
  const program = createProgram(gl, vertexShader, fragmentShader);

  const positionAttributeLocation = gl.getAttribLocation(program, "position");
  const imageSizeLocation = gl.getUniformLocation(program, "imageSize");

  // binding the position buffer to positionBuffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // using the program defined above
  gl.useProgram(program);
  // enabling the texcoord attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // setting up the size of the image
  gl.uniform2f(imageSizeLocation, canvas.width, canvas.height);
  // telling positionAttributeLocation how to retrieve data out of positionBuffer
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  // provide the texture coordinates
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1, 1, -1, -1, 1]),
    gl.STATIC_DRAW
  );

  // loading the original image as a texture
  const texture = gl.createTexture();
  texture.image = new Image();
  // setting the anonymous mode
  // Learn more about it here:
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/crossOrigin
  texture.image.crossOrigin = "";
  texture.image.src = originalImage.src;

  texture.image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // setting the parameters to be able to render any image,
    // regardless of its size
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    // loading the original image as a texture
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      texture.image
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
}

function compileShader(gl, type, shaderSource) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  const outcome = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (outcome === false) {
    // logging the error message on failure
    console.error(gl.getShaderInfoLog(shader));

    gl.deleteShader(shader);
  }

  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const outcome = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (outcome === false) {
    // logging the error message on failure
    console.error(gl.getProgramInfoLog(program));

    gl.deleteProgram(program);
  }

  return program;
}

// initializing the filtered image
filterImage(canvas, originalImage, filters[currentSelection]);
