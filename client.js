const { fork } = require("child_process");
const { connect } = require("net");

function multiplexChannels(sources, destination) {
  let openChannels = sources.length;

  for (let i = 0; i < openChannels; i++) {
    sources[i]
      .on("readable", () => {
        let chunk;
        while ((chunk = sources[i].read()) !== null) {
          // 1 for channel id , 4 for chunk length and remaining for actual data
          const outBuffer = Buffer.alloc(1 + 4 + chunk.length);
          outBuffer.writeUint8(i, 0);
          outBuffer.writeUint32BE(chunk.length, 1);
          chunk.copy(outBuffer, 5);
          console.log(`Sending packet to channel ${i}`);

          destination.write(outBuffer);
        }
      })
      .on("end", () => {
        if (--openChannels === 0) {
          destination.end();
        }
      });
  }
}

const socket = connect(3000, () => {
  const child = fork(process.argv[2], process.argv.slice(3), { silent: 3 });
  multiplexChannels([child.stdout, child.stderr], socket);
});
