import React from 'react';

function Card({ id, image, style = {} }) {
  // Stili di default
  const defaultStyles = {
    width: '60px',
    height: '90px',
    borderRadius: '5px'
  };

  // Unisce gli stili di default con quelli passati come prop
  const finalStyles = { ...defaultStyles, ...style };

  return (
    <img
      src={image}
      alt={`Card ${id}`}
      style={finalStyles}
    />
  );
}

export default Card;