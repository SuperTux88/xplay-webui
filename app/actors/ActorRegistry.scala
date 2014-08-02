package actors

import actors.UDPConnectionStatusActorMessages.Tick
import akka.actor.Props
import play.api.libs.concurrent.Akka._
import scala.concurrent.duration._
import scala.concurrent.ExecutionContext.Implicits.global

/**
 * Created by becker on 01.08.14.
 */
object ActorRegistry {

  import play.api.Play.current


  val udpConnectionStatusActor = system.actorOf(Props[UDPConnectionStatusActor], name="udpConnectionStatusActor")
  system.scheduler.schedule(0.milliseconds, 1.seconds, udpConnectionStatusActor, Tick)

  val gpsPositionActor = system.actorOf(Props[GPSPositionActor], name="gpsPositionActor")
  val pitchRollHeadingActor = system.actorOf(Props[PitchRollHeadingActor], name="pitchRollHeadingActor")
  val xplaneDataReceiver = system.actorOf(Props[XPlaneUDPReceiverActor], name = "xplaneReceiver")
  val websocketRegistry = system.actorOf(Props[WebSocketRegistry], name = "websocketRegistry")

}
