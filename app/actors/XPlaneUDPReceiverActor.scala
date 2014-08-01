package actors

import java.net.InetSocketAddress

import akka.actor.{Actor, ActorRef}
import akka.io.Udp.Command
import akka.io.{Udp, IO}
import akka.util.ByteString

/* Messages */
case class MessageFloats(floats: List[Float])
object GetUDPConnectionStatus
case class UDPConnectionStatus(status: String)


class XPlaneUDPReceiverActor() extends Actor with XPlanePayloadParser {

  import context.system
  IO(Udp) ! Udp.Bind(self, new InetSocketAddress("127.0.0.1", 48000))


  def receive = {

    case Udp.Bound(local) => {
      println("actor connected to udp")
      context.become(receivingXplaneData(sender()))
    }

    case Udp.CommandFailed(command) => {
      println(s"command failed!")
      context.become(connectFailed(command))
    }

    case GetUDPConnectionStatus => sender ! UDPConnectionStatus("connecting")

    //case msg => println(s"unhandled msg received: $msg")

  }

  def receivingXplaneData(connection: ActorRef): Receive = {

    case Udp.Received(data, remote) => {


      try {

        // data is structured as the following: first 5 bytes are DATA@
        // followed by a chunk of 36 bytes
        //      => first 4 bytes: index number of data element in data output screen from xplane (eg 20 = gps)
        //      => last 32 bytes: data (up to  8 single precising floating point numbers)

        val (_, message) = data.splitAt(5)

        message.grouped(36) foreach { payload =>

          val messageType = payload(0)
          val messageContent = payload.takeRight(32)

          val floats = parseFloatsFromMessage(messageContent)

          messageType match {
            case 20 => ActorRegistry.gpsCoordsActor ! MessageFloats(floats)
            case 17 => ActorRegistry.pitchRollHeadingActor ! MessageFloats(floats)

            case unknown => println(s"ignoring message type $unknown because i can't handle this")
          }

        }

      } catch {

        case e: Exception => {
          println(s"exception caught while parsing message $data")
          e.printStackTrace()
        }

      }

    }

    case GetUDPConnectionStatus => {
      sender ! UDPConnectionStatus("ready, receiving data")
    }

  }

  def connectFailed(command: Command): Receive = {
    case GetUDPConnectionStatus => sender ! UDPConnectionStatus("failed")
  }



}




