import React,{useState, useEffect,useRef} from "react"
import ReactFileReader from 'react-file-reader'

import * as THREE from "three"
import OBJLoader from 'three-obj-loader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import "../../static/index.css"

OBJLoader(THREE);

const server = "http://3.85.224.40:3001"

//const SERVER_URL = "http://23.95.246.124:8001"
const SERVER_URL = "http://3.85.224.40:3001"

const imagesLink = [
  "/images/rose.jpg",
  "/images/faucet.jpg",
  "/images/bottle.jpg",
  "/images/utensils.jpg",
  "/images/mac.jpg"
]

export default function Home() {
  const [state,setState] = useState({
    preview: null,
    depthmap:{
      links: [],
      selected: null
    },
    compression: 6
  })

  let domRef;
  let scene = useRef(null);
  let obj = useRef(null);



  useEffect(() => {
    // Make camera
    let near =0.1;
    let far=100000;
    let fov=1;
    let radiusOfCamera=2;
    let heightOfCamera=0;
    let aspect = domRef.offsetWidth/domRef.offsetHeight;
    let camera = new THREE.PerspectiveCamera(fov,aspect,near,far);

    scene.current = new THREE.Scene();
    let renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor( 0x99bbee, 1);

    const limitingAngle = 2.5

    let controls = new OrbitControls(camera,renderer.domElement);
    controls.minAzimuthAngle = -limitingAngle * Math.PI/180
    controls.maxAzimuthAngle = limitingAngle * Math.PI/180

    controls.minPolarAngle = Math.PI/2 - limitingAngle * Math.PI/180
    controls.maxPolarAngle = Math.PI/2 + limitingAngle * Math.PI/180

    camera.position.z = radiusOfCamera;
    camera.position.y = heightOfCamera;

    

    renderer.setSize(domRef.offsetWidth, domRef.offsetHeight);
    domRef.appendChild(renderer.domElement);

    let animate = function () {
    requestAnimationFrame(animate);

    renderer.render(scene.current, camera);

  }
  animate();

    
  },[]);

  const setPreview = (url) => setState(prevState => ({...prevState,preview:url}));
  const setDepthLinks = (links) => setState(prevState => ({...prevState,depthmap:{...prevState.depthmap,links}}))
  const setCompression = (compression) => setState(prevState => ({...prevState,compression}))


  const handleImageChange = async (e) => {
    const formData = new FormData();

    const file = e.target.files[0];

    setPreview(URL.createObjectURL(file));

    formData.append("image",file)
    formData.append("token","Lmao")

    const resp = await fetch(SERVER_URL+"/api/generateDepths",{
      method: "POST",
      body: formData,
    })

    const respJSON = await resp.json();

    console.log(respJSON);

    setDepthLinks(respJSON.depths);
  };

  const handleDepthChange = async (link) => {
    const formData = new FormData();
    formData.append("link",link)
    formData.append("compression",state.compression)

    const resp = await fetch(SERVER_URL+"/api/generateObj",{
      method: "POST",
      body:formData
    })

    const respJSON = await resp.json();

    let loader= new THREE.OBJLoader();

    console.log(respJSON)


    //scene.current.add(cube)

    loader.load(SERVER_URL+"/"+respJSON.obj,
        (object)=>{
          const textureLoader = new THREE.TextureLoader();
          const material = new THREE.MeshBasicMaterial({map:textureLoader.load(SERVER_URL+"/"+respJSON.texture)})
          console.log("Finished loading");
          object.material = material;

          object.traverse(child=>{
            console.log(child)
            child.material = material;
          })
          
          scene.current.remove(obj.current);
          obj.current = object;
          scene.current.add(obj.current);
    })

    console.log(respJSON);
  }

  return (
    <div style={{height:"100vh",width:"100vw",display:"flex"}}>
      <div style={{width:"20%",height:"100%",backgroundColor:"#e9b",borderRight:"1px solid black"}}>
        <div>
          {state.preview ? <img style={{width:"100%"}} src={state.preview}/> : null}
          <input type="file" onChange={ (e) => handleImageChange(e)}/>
        </div>
        <div>

        </div>
      </div>
      <div style={{width:"20%",height:"100%",backgroundColor:"#be9",borderRight:"1px solid black"}}>
        <div style={{width:"100%"}}>
          <p style={{textAlign:"center"}}>Compression</p>
          <input style={{width:"100%"}}
            type="range" min="1" max="10"
            value={state.compression}
            onChange={e => setCompression(e.target.value)}></input>

        </div>
        <div style={{width:"100%",overflowY:"scroll",height:"100%"}}>
          {state.depthmap.links.map( (link,i) => <img key={i} onClick={ () => handleDepthChange(link)} style={{width:"100%"}} src={SERVER_URL+"/"+link} />)}
        </div>
      </div>
      <div style={{width:"60%",height:"100%",backgroundColor:"#9be"}}>
        <div ref={ref => {domRef = ref}} style={{width:"100%",height:"100%"}}>

        </div>
      </div>
    </div>
  )
}
