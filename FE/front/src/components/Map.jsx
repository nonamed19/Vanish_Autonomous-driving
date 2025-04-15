import React, { useState } from 'react';
import Map1 from "../assets/images/Map1.png";
import Map2 from "../assets/images/Map2.png";
import Map3 from "../assets/images/Map3.png";
import Map4 from "../assets/images/Map4.png";
import Map5 from "../assets/images/Map5.png";
import Map6 from "../assets/images/Map6.png";
import Map7 from "../assets/images/Map7.png";
import Map8 from "../assets/images/Map8.png";
import Map9 from "../assets/images/Map9.png";
import Map10 from "../assets/images/Map10.png";
import styles from '../styles/Map.module.css';

function Map() {
  const maps = [Map1, Map2, Map3, Map4, Map5, Map6, Map7, Map8, Map9, Map10];
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleClick = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % maps.length);
  };

  return (
    <div className={styles.mapContainer}>
      <div className={styles.backgroundImage} />
      <img 
        src={maps[currentIndex]} 
        alt="Map" 
        className={styles.mapImage} 
        onClick={handleClick} 
      />
    </div>    
  );
}

export default Map;
