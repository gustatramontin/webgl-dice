"use strict";

const pi = Math.PI

const buffers = {}
const attributes = {}
const uniforms = {}

var gl,program,texture,total_verts
var angle = [0,0,0]
var begin = [0,0,0]
var number = 0 
var weight = 0
const numbers = [[0,0,0], [0,pi,0], [pi/2,0,0], [-pi/2,0,0], [0,pi/2,0], [0,-pi/2,0]]




async function loadModel() 
{
	const req = await fetch("dice.obj")
	const text = await req.text()

	let vertices = []
	let indexes = []
	let uvs_i = []
	let uvs = []

	for (let l of text.split("\n")) 
	{
		const items = l.split(" ")
		const t = items[0]
		const j = items.slice(1,4)

		if (t == "v")
		{
			vertices.push(j.map(Number))
		}
		if (t == "f")
		{
			indexes.push(j.map(x => Number(x.split("/")[0]) - 1))
			uvs_i.push(j.map(x => Number(x.split("/")[1]) - 1))
		}

		if (t == "vt")
		{
			uvs.push(j.map(Number))
		}
	}

	let uvs_final = Array(indexes.length*3)
	for (let i in indexes) 
	{
		uvs_final[indexes[i][0]] = uvs[uvs_i[i][0]]
		uvs_final[indexes[i][1]] = uvs[uvs_i[i][1]]
		uvs_final[indexes[i][2]] = uvs[uvs_i[i][2]]
	}
	uvs_final = uvs_final.flat()
	vertices = vertices.flat()
	indexes = indexes.flat()

	total_verts = indexes.length

	return {vertices: vertices, indexes: indexes, uvs: uvs_final}
}

function lerp(x,y,w) 
{
	return (1-w)*x + y*w
}

function roll() 
{
	number = Math.floor(Math.random()*6)
	console.log(number+1)
	weight = 0
	begin = angle
}

function makeBuffer(gl, type, data)
{
	const buffer = gl.createBuffer()
	gl.bindBuffer(type, buffer)

	gl.bufferData(type, data, gl.STATIC_DRAW)

	return buffer
}

function initIndexBuffer(gl) 
{

	const indices = [
		0,
		1,
		2,
		0,
		2,
		3, // front
		4,
		5,
		6,
		4,
		6,
		7, // back
		8,
		9,
		10,
		8,
		10,
		11, // top
		12,
		13,
		14,
		12,
		14,
		15, // bottom
		16,
		17,
		18,
		16,
		18,
		19, // right
		20,
		21,
		22,
		20,
		22,
		23, // left
	];

	return makeBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices))

}
function createShader(gl,type,source)
{
	const shader = gl.createShader(type)
	gl.shaderSource(shader, source)
	gl.compileShader(shader)

	const success = gl.getShaderParameter(shader,gl.COMPILE_STATUS)

	if (success)
	{
		return shader
	}

	console.log(gl.getShaderInfoLog(shader))
	gl.deleteShader(shader)
	
}

function createProgram(gl, vertexShader, fragmentShader)
{
	const program = gl.createProgram()
	gl.attachShader(program, vertexShader)
	gl.attachShader(program, fragmentShader)

	gl.linkProgram(program)

	const success = gl.getProgramParameter(program, gl.LINK_STATUS)
	if (success)
	{
		return program
	}
	console.log(gl.getProgramInfoLog(program))
	gl.deleteProgram(program)
}

async function init()
{

	const canvas = document.querySelector("#c")
	gl = canvas.getContext("webgl")

	if (!gl)
	{
	}

	const vertexShaderSource = document.querySelector("#vertex-shader").text
	const fragmentShaderSource = document.querySelector("#fragment-shader").text

	const vertex_shader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
	const fragment_shader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)


	program = createProgram(gl, vertex_shader, fragment_shader)

	attributes.position = gl.getAttribLocation(program, "a_position")
	//attributes.colors = gl.getAttribLocation(program, "a_color")
	attributes.texture = gl.getAttribLocation(program, "a_texcoord")

	uniforms.transform = gl.getUniformLocation(program, "transform")
	uniforms.perspective = gl.getUniformLocation(program, "perspective")
	uniforms.texture = gl.getUniformLocation(program, "u_texture")

	const model = await loadModel()
	console.log("loaded model")
	buffers.index = makeBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indexes)) //initIndexBuffer(gl)

	buffers.position = makeBuffer(gl, gl.ARRAY_BUFFER,new Float32Array(model.vertices))

	/*buffers.colors = makeBuffer(gl, gl.ARRAY_BUFFER, new Float32Array([
		[1,0,0,1],
		[1,1,0,1],
		[0,1,0,1],
		[1,0,1,1],
		[0,0,1,1],
		[0,1,1,1],
	].flatMap(x => [x,x,x,x].map(x => x.flat())).flat()))*/

	const texcoord = [
	//	1
	0,1/3,
	0,2/3,
	1/4,2/3,
	1/4,1/3,
	//	2
	1/4,1/3,
	1/4,2/3,
	2/4,2/3,
	2/4,1/3,
	//	3
	2/4,1/3,
	2/4,2/3,
	3/4,2/3,
	2/3,1/3,
	//	4
	3/4,1/3,
	3/4,2/3,
	1,2/3,
	1,1/3,
	//	5
	1/4,2/3,
	1/4,1,
	2/4,1,
	2/4,2/3,
	//	6
	1/4,0,
	1/4,1/3,
	2/4,1/3,
	2/4,0,
	]
	buffers.texture = makeBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(model.uvs))

	texture = gl.createTexture()
	gl.bindTexture(gl.TEXTURE_2D, texture)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1,1,0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,255,255,255]))

	const image = new Image()
	image.src = "dicetex.jpg"
	image.onload = () => {
		gl.bindTexture(gl.TEXTURE_2D, texture)
		gl.texImage2D(gl.TEXTURE_2D, 0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
		//gl.generateMipmap(gl.TEXTURE_2D)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
	}


}

function draw(dt)
{
	gl.viewport(0,0, gl.canvas.width, gl.canvas.height)

	gl.clearColor(0,0,1,1)
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

	gl.enable(gl.DEPTH_TEST)

	gl.useProgram(program)

	gl.enableVertexAttribArray(attributes.position)
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);


	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index)

	const size = 3
	const type = gl.FLOAT
	const normalize = false
	const stride = 0
	const voffset = 0

	gl.vertexAttribPointer(attributes.position, size, type, normalize, stride, voffset)

	/*
	gl.enableVertexAttribArray(attributes.colors)
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colors);

	gl.vertexAttribPointer(attributes.colors, 4, gl.FLOAT, false, 0, 0)
	*/

	gl.enableVertexAttribArray(attributes.texture)
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture)
	gl.vertexAttribPointer(attributes.texture, 2, gl.FLOAT, false, 0,0)


	const transform = mat4.create()
	mat4.translate(transform, transform, [0,0,-10])
	//mat4.rotate(transform, transform, dt, [1,1,1])
	//mat4.rotate(transform, transform, -Math.PI/2, [1,0,0])
	
	angle[0] = lerp(begin[0],numbers[number][0],weight)
	angle[1] = lerp(begin[1],numbers[number][1],weight)
	angle[2] = lerp(begin[2],numbers[number][2],weight)
	
	weight += 0.01
	weight = Math.min(weight, 1)

	mat4.rotate(transform, transform, angle[0], [1,0,0])
	mat4.rotate(transform, transform, angle[1], [0,1,0])
	mat4.rotate(transform, transform, angle[2], [0,0,1])

	mat4.rotate(transform, transform, 0.3, [1,1,1])
	gl.uniformMatrix4fv(uniforms.transform, false, transform)
	
	const perspective = mat4.create()
	mat4.perspective(perspective, Math.PI/4, gl.canvas.width/gl.canvas.height, 0.1,100)
	gl.uniformMatrix4fv(uniforms.perspective, false, perspective)

	gl.uniform1i(uniforms.texture,0)
	gl.activeTexture(gl.TEXTURE0)
	gl.bindTexture(gl.TEXTURE_2D, texture)


	const primitiveType = gl.TRIANGLES
	const doffset = 0
	const count = total_verts
	gl.drawElements(primitiveType, count, gl.UNSIGNED_SHORT,doffset)
}

function run() 
{
	let then = performance.now()
	let tick = 0
	const loop = () => {

		const now = performance.now()
		const deltaTime = now - then
		then = now
		tick += deltaTime
		if (tick >= 16)
		{
			draw(performance.now()/1000)
			tick = 0
		}

		requestAnimationFrame(loop)
	}

	requestAnimationFrame(loop)
}
init().then(_ => run())
