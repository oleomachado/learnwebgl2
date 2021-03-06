/**
 * bezier_scene.js, By Wayne Brown, Fall 2017
 */

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 C. Wayne Brown
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

"use strict";

/** -----------------------------------------------------------------------
 * Create a WebGL 3D scene, store its state, and render its models.
 *
 * @param id {string} The id of the webglinteractive directive
 * @param download {SceneDownload} An instance of the SceneDownload class
 * @param vshaders_dictionary {object} A dictionary of vertex shaders.
 * @param fshaders_dictionary {object} A dictionary of fragment shaders.
 * @param models {object} A dictionary of models.
 * @constructor
 */
window.BezierChainedScene = function (id, download, vshaders_dictionary,
                                fshaders_dictionary, models) {

  // Private variables
  let self = this;
  let my_canvas = null;

  let gl = null;
  let program = null;
  let uniform_program;
  let textx, texty, textz, cubex, cubey, cubez, cube_center;
  let textx_gpu, texty_gpu, textz_gpu, cubex_gpu, cubey_gpu,
      cubez_gpu, cube_center_gpu;

  let x_axis_gpu, y_axis_gpu, z_axis_gpu;
  let x_axis, y_axis, z_axis;

  let sphere, sphere_gpu;
  let path_models = null;

  let matrix = new window.GlMatrix4x4();
  let transform = matrix.create();
  let projection;
  let camera = matrix.create();
  let rotate_x_matrix = matrix.create();
  let rotate_y_matrix = matrix.create();
  let scale_axes = matrix.create();
  let base = matrix.create();
  let path_transform = matrix.create();

  let point_translate = matrix.create();
  let point_scale = matrix.create();
  matrix.scale(point_scale, 0.1, 0.1, 0.1);

  // Public variables that will possibly be used or changed by event handlers.
  self.angle_x = 0.0;
  self.angle_y = 0.0;
  self.out = download.out;

  let P = new GlPoint4();
  let path1_points = [P.create(-5, 0, 0),
                      P.create(-5, 0, 0),
                      P.create(-5, 0, 5),
                      P.create( 0, 0.5, 5)];
  let path2_points = [P.create( 0, 0.5, 5),
                      P.create( 5, 1, 5),
                      P.create( 5, 2,-5),
                      P.create( 0, 2.2,-5)];
  let path3_points = [P.create( 0, 2.2,-5),
                      P.create(-7, 3,-5),
                      P.create(-7, 4, 0),
                      P.create(-3, 5, 4)];
  let path4_points = [P.create(-3, 5, 4),
                      P.create( 2, 4.5,2.5),
                      P.create( 0, 4, 0),
                      P.create( 0, 4, 0)];
  let path1 = new BezierPath(path1_points, 0, 30);
  let path2 = new BezierPath(path2_points, 30, 60);
  let path3 = new BezierPath(path3_points, 60, 90);
  let path4 = new BezierPath(path4_points, 90, 120);
  let path = new BezierSeries(path1, path2, path3, path4);

  let path_colors = [[0,0,0,1], [1,0,0,1], [0,1,0,1], [0,0,1,1]];
  self.path_segment_visible = [true, true, true, true];

  self.current_frame = 0;
  self.frame_rate = 16; // 1/60 second in milliseconds.

  //-----------------------------------------------------------------------
  function _renderCubes(transform) {
    textx.render(transform);
    texty.render(transform);
    textz.render(transform);
    cubex.render(transform);
    cubey.render(transform);
    cubez.render(transform);
    cube_center.render(transform);
  }

  //-----------------------------------------------------------------------
  self.render = function () {

    // Build individual transforms
    matrix.setIdentity(transform);
    matrix.rotate(rotate_x_matrix, self.angle_x, 1, 0, 0);
    matrix.rotate(rotate_y_matrix, self.angle_y, 0, 1, 0);
    matrix.multiplySeries(base, projection, camera, rotate_x_matrix, rotate_y_matrix);

    // Render the cubes models
    path.transform(path_transform, self.current_frame);
    matrix.multiplySeries(transform, base, path_transform);
    _renderCubes(transform);

    // Render the global axes
    matrix.multiplySeries(transform, base, scale_axes);
    x_axis.render(transform);
    y_axis.render(transform);
    z_axis.render(transform);

    //  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Render the paths:
    // Render the control points on the bezier path
    for (let k=0; k<path.segments.length; k++) {

      if (self.path_segment_visible[k]) {
        let segment = path.segments[k];

        for (let j = 0; j < 4; j++) {
          matrix.translate(point_translate, segment.control_points[j][0],
                                            segment.control_points[j][1],
                                            segment.control_points[j][2]);
          matrix.multiplySeries(transform, base, point_translate, point_scale);
          sphere.render(transform, path_colors[k]);
        }

        path_models[k].render(base);
      }
    }
  };

  //-----------------------------------------------------------------------
  self.delete = function () {

    // Clean up shader programs
    gl.deleteShader(program.vShader);
    gl.deleteShader(program.fShader);
    gl.deleteProgram(program);

    // Delete each model's VOB
    textx.delete(gl);
    texty.delete(gl);
    textz.delete(gl);
    cubex.delete(gl);
    cubey.delete(gl);
    cubez.delete(gl);
    cube_center.delete(gl);
    x_axis.delete(gl);
    y_axis.delete(gl);
    z_axis.delete(gl);

    self.events.removeAllEventHandlers();
  };

  //-----------------------------------------------------------------------
  // Object constructor. One-time initialization of the scene.

  // Get the rendering context for the canvas
  my_canvas = download.getCanvas(id + "_canvas");  // by convention
  if (my_canvas) {
    gl = download.getWebglContext(my_canvas);
  }
  if (!gl) {
    return;
  }

  // Set up the rendering program and set the state of webgl
  program = download.createProgram(gl, vshaders_dictionary["color_per_vertex"], fshaders_dictionary["color_per_vertex"]);
  uniform_program = download.createProgram(gl, vshaders_dictionary["uniform_color"], fshaders_dictionary["uniform_color"]);

  gl.enable(gl.DEPTH_TEST);

  gl.clearColor(0.98, 0.98, 0.98, 1.0);

  projection = matrix.createPerspective(45.0, 1.0, 1.0, 100.0);
  matrix.lookAt(camera, 0, 0, 24, 0, 0, 0, 0, 1, 0);

  // Create Vertex Object Buffers for the cubes models and
  // pre-processing for rendering.
  textx_gpu = new ModelArraysGPU(gl, models.textx, self.out);
  textx = new RenderColorPerVertex(gl, program, textx_gpu, self.out);

  texty_gpu = new ModelArraysGPU(gl, models.texty, self.out);
  texty = new RenderColorPerVertex(gl, program, texty_gpu, self.out);

  textz_gpu = new ModelArraysGPU(gl, models.textz, self.out);
  textz = new RenderColorPerVertex(gl, program, textz_gpu, self.out);

  cubex_gpu = new ModelArraysGPU(gl, models.cubex, self.out);
  cubex = new RenderColorPerVertex(gl, program, cubex_gpu, self.out);

  cubey_gpu = new ModelArraysGPU(gl, models.cubey, self.out);
  cubey = new RenderColorPerVertex(gl, program, cubey_gpu, self.out);

  cubez_gpu = new ModelArraysGPU(gl, models.cubez, self.out);
  cubez = new RenderColorPerVertex(gl, program, cubez_gpu, self.out);

  cube_center_gpu = new ModelArraysGPU(gl, models.cube_center, self.out);
  cube_center = new RenderColorPerVertex(gl, program, cube_center_gpu, self.out);

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Setup of models to render the global axes
  x_axis_gpu = new ModelArraysGPU(gl, models.x_axis, self.out);
  y_axis_gpu = new ModelArraysGPU(gl, models.y_axis, self.out);
  z_axis_gpu = new ModelArraysGPU(gl, models.z_axis, self.out);

  x_axis = new RenderColorPerVertex(gl, program, x_axis_gpu, self.out);
  y_axis = new RenderColorPerVertex(gl, program, y_axis_gpu, self.out);
  z_axis = new RenderColorPerVertex(gl, program, z_axis_gpu, self.out);

  // Set the scaling for the global axes.
  matrix.scale(scale_axes, 0.4, 0.4, 0.4);

  // Create a small sphere to render the path control points
  sphere_gpu = new ModelArraysGPU(gl, models.Sphere, self.out);
  sphere = new RenderUniformColor(gl, uniform_program, sphere_gpu, self.out);

  path_models = new Array(path.segments.length);
  for (let j=0; j<path_models.length; j++) {
    path_models[j] = new PathModel(gl, uniform_program, path.segments[j], path_colors[j]);
  }

  // Set up callbacks for user and timer events
  self.events = new BezierChainedEvents(id, self);
};

