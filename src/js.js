function imgfull(img) {
  const popout = document.getElementById('poputfull');
  if (popout) {
    popout.remove();
  }
  const popoutHTML = `
      <div class="poputfullchile">
        <img src="${img}" alt="Pop-up Image">
      </div>
      <div class="poputfullremove" onclick="poputfullremove()"></div>
    `;
  const newPopout = document.createElement('div');
  newPopout.id = 'poputfull';
  newPopout.innerHTML = popoutHTML;
  document.body.appendChild(newPopout);
}
function poputfullremove() {
  const popout = document.getElementById('poputfull');
  if (popout) {
    popout.remove();
  } else {
    console.log('Element to remove not found.');
  }
}
