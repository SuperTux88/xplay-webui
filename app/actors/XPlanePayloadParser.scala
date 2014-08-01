package actors

import java.nio.ByteOrder

import akka.util.ByteString

trait XPlanePayloadParser {

  def parseFloatsFromMessage(bytes: ByteString): List[Float] = {

    // 32 bytes, 4 byte floats
    bytes.grouped(4).map(_.asByteBuffer).map(floatByteBuffer => {
      floatByteBuffer.order(ByteOrder.LITTLE_ENDIAN)
      floatByteBuffer.getFloat
    }).toList

  }
}
