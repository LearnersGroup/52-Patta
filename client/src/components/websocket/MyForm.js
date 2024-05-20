import React, { useState } from 'react';
import { socket } from '../../socket';

export function MyForm() {
  const [value, setValue] = useState('');

  function onSubmit(event) {
    event.preventDefault();

    socket.emit('message', value);
  }

  return (
    <form onSubmit={ onSubmit }>
      <input onChange={ e => setValue(e.target.value) } />
      <button type="submit">Submit</button>
    </form>
  );
}