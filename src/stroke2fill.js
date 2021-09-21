const Svg2 = require('oslllo-svg2');
const Potrace = require('oslllo-potrace');

function svgFromPathData(
  pathData,
  origWidth,
  origHeight,
  strokeWidth,
  hasFillAttr
) {
  const fill = hasFillAttr ? 'fill="#000000"' : '';
  const width = 600;
  const height = (width / origWidth) * origHeight;
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<svg width="${width}" height="${height}" viewBox="0 0 ${origWidth} ${origHeight}" ` +
    `fill="none" xmlns="http://www.w3.org/2000/svg">\n` +
    `  <path d="${pathData}" stroke="#000000" stroke-width="${strokeWidth}" ${fill}/>\n` +
    '</svg>\n'
  );
}

async function stroke2fill(pathData, width, height, strokeWidth, hasFillAttr) {
  const svgBuffer = svgFromPathData(
    pathData,
    width,
    height,
    strokeWidth,
    hasFillAttr
  );
  var pngBuffer = await Svg2(svgBuffer).png({ transparent: false }).toBuffer();
  var traced = await Potrace(pngBuffer, { svgSize: width / 600 }).trace();
  var element = await Svg2(traced).toElement();
  return element.firstChild.getAttribute('d');
}

module.exports = stroke2fill;
