import React, {
	createContext,
	useState,
	useRef,
	useEffect,
} from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';

const SocketContext = createContext();

const socket = io('http://localhost:5000');

const ContextProvider = ({ children }) => {
	const [stream, setStream] = useState(null);
	const [me, setMe] = useState('');
	const [call, setCall] = useState({});
	const [callAccepted, setCallAccepted] =
		useState(false);
	const [callEnded, setCallEnded] =
		useState(false);
	const [name, setName] = useState('');
	const myVideo = useRef();
	const userVideo = useRef();
	const connectionRef = useRef();
	useEffect(() => {
		navigator.mediaDevices
			.getUserMedia({ video: true, audio: true })
			.then((currentStream) => {
				setStream(currentStream);

				myVideo.current.srcObject = currentStream;

				socket.on('me', (id) => {
					setMe(id);
				});
				socket.on(
					'calluser',
					({
						from,
						signal,
						name: callerName,
					}) => {
						setCall({
							isReceivedCall: true,
							from,
							name: callerName,
							signal,
						});
					}
				);
			});
	}, []);

	const answerCall = () => {
		setCallAccepted(true);

		const peer = new Peer({
			initiator: false,
			stream: stream,
			trickle: false,
		});
		peer.on('signal', (data) => {
			socket.emit('answercall', {
				to: call.from,
				signal: data,
			});
		});
		peer.on('stream', (currentStream) => {
			userVideo.current.srcObject = currentStream;
		});
		peer.signal(call.signal);
		connectionRef.current = peer;
	};

	const callUser = (id) => {
		const peer = new Peer({
			initiator: true,
			stream: stream,
			trickle: false,
		});
		peer.on('signal', (data) => {
			socket.emit('calluser', {
				userToCall: id,
				signaData: data,
				from: me,
				name,
			});
		});
		peer.on('stream', (currentStream) => {
			userVideo.current.srcObject = currentStream;
		});

		socket.on('callaccepted', (signal) => {
			setCallAccepted(true);
			peer.signal(signal);
		});

		connectionRef.current = peer;
	};

	const leaveCall = () => {
		setCallEnded(true);
		connectionRef.current.destroy();
		window.location.reload();
	};

	return (
		<SocketContext.Provider
			value={{
				call,
				callAccepted,
				callEnded,
				stream,
				me,
				name,
				answerCall,
				callUser,
				leaveCall,
				myVideo,
				userVideo,
				setName,
			}}>
			{children}
		</SocketContext.Provider>
	);
};

export { SocketContext, ContextProvider };
