import {
	useAckFile,
	useFileInfo,
	useSendFile,
	useSignFile,
	useViewFile,
} from "@filosign/react/hooks";
import {
	CheckCircleIcon,
	DownloadIcon,
	EyeIcon,
	FileTextIcon,
	SignatureIcon,
	SpinnerIcon,
	UploadIcon,
} from "@phosphor-icons/react";
import React, { useState } from "react";
import { Button } from "../../../lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../../../lib/components/ui/card";
import { Input } from "../../../lib/components/ui/input";
import { Label } from "../../../lib/components/ui/label";

export function FileTest() {
	// New file hooks
	const sendFile = useSendFile();
	const [pieceCidForInfo, setPieceCidForInfo] = useState<string | undefined>(
		undefined,
	);
	const fileInfo = useFileInfo({ pieceCid: pieceCidForInfo });
	const viewFile = useViewFile();
	const ackFile = useAckFile();
	const signFile = useSignFile();

	// Input states
	const [fileToUpload, setFileToUpload] = useState<File | null>(null);
	const [recipientAddress, setRecipientAddress] = useState("");
	const [recipientEncryptionKey, setRecipientEncryptionKey] = useState("");
	const [pieceCidToView, setPieceCidToView] = useState("");
	const [kemCiphertext, setKemCiphertext] = useState("");
	const [fileStatus, setFileStatus] = useState<"s3" | "foc">("s3");
	const [pieceCidToAck, setPieceCidToAck] = useState("");
	const [pieceCidToSign, setPieceCidToSign] = useState("");
	const [signatureBytes, setSignatureBytes] = useState("");
	const [encryptedEncryptionKey, setEncryptedEncryptionKey] = useState("");
	const [signaturePosition, _setSignaturePosition] = useState({
		top: 10,
		left: 20,
	});

	// File metadata states
	const [fileTags, setFileTags] = useState("");

	// File data state
	const [downloadedFile, setDownloadedFile] = useState<{
		fileBytes: Uint8Array;
		fileName: string;
		fileMIME: string;
		fileTags: string[] | null;
		sender: string;
		timestamp: number;
		signaturePositionOffset: { top: number; left: number };
	} | null>(null);

	const handleFileUpload = async () => {
		if (
			!fileToUpload ||
			!recipientAddress.trim() ||
			!recipientEncryptionKey.trim()
		)
			return;

		try {
			const fileData = new Uint8Array(await fileToUpload.arrayBuffer());

			const pieceCID = await sendFile.mutateAsync({
				recipient: {
					address: recipientAddress as `0x${string}`,
					encryptionPublicKey: recipientEncryptionKey,
				},
				bytes: fileData,
				signaturePositionOffset: signaturePosition,
				// fileName: fileToUpload.name,
				// fileMIME: fileToUpload.type || 'application/octet-stream',
				// fileTags: fileTags.trim() ? fileTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
			});

			console.log("File uploaded successfully!");
			console.log("Piece CID:", pieceCID);
			alert(`File uploaded successfully! Piece CID: ${pieceCID}`);

			setFileToUpload(null);
			setRecipientAddress("");
			setRecipientEncryptionKey("");
			setFileTags("");
		} catch (error) {
			console.error("Failed to upload file", error);
		}
	};

	const handleViewFileDetails = () => {
		if (!pieceCidToView.trim()) return;
		setPieceCidForInfo(pieceCidToView);
	};

	// Effect to populate download fields when file info is successfully loaded
	React.useEffect(() => {
		if (fileInfo.data) {
			console.log("File info retrieved:", fileInfo.data);
			setKemCiphertext(fileInfo.data.kemCiphertext);
			setEncryptedEncryptionKey(fileInfo.data.encryptedEncryptionKey);
			// Set file status based on the status field ("foc" = Filecoin, "s3" = S3)
			if (fileInfo.data.status === "foc") {
				setFileStatus("foc");
			} else if (fileInfo.data.status === "s3") {
				setFileStatus("s3");
			}
		}
	}, [fileInfo.data]);

	const handleDownloadFile = async () => {
		if (
			!pieceCidToView.trim() ||
			!kemCiphertext.trim() ||
			!encryptedEncryptionKey.trim()
		)
			return;

		try {
			const fileData = await viewFile.mutateAsync({
				pieceCid: pieceCidToView,
				kemCiphertext: kemCiphertext,
				encryptedEncryptionKey: encryptedEncryptionKey,
				status: fileStatus,
			});
			setDownloadedFile(fileData);
			console.log("File downloaded successfully");
		} catch (error) {
			console.error("Failed to download file", error);
		}
	};

	const handleAckFile = async () => {
		if (!pieceCidToAck.trim()) return;

		try {
			await ackFile.mutateAsync({
				pieceCid: pieceCidToAck,
			});
			console.log("File acknowledged successfully");
			setPieceCidToAck("");
		} catch (error) {
			console.error("Failed to acknowledge file", error);
		}
	};

	const handleSignFile = async () => {
		if (!pieceCidToSign.trim() || !signatureBytes.trim()) return;

		try {
			// Convert hex string to Uint8Array for signing
			const signatureBytesArray = new Uint8Array(
				signatureBytes.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ||
					[],
			);

			await signFile.mutateAsync({
				pieceCid: pieceCidToSign,
				signatureBytes: signatureBytesArray,
			});
			console.log("File signed successfully");
			setPieceCidToSign("");
			setSignatureBytes("");
		} catch (error) {
			console.error("Failed to sign file", error);
		}
	};

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setFileToUpload(file);
			// Reset metadata fields when a new file is selected
			setFileTags("");
		}
	};

	return (
		<div className="space-y-6">
			{/* Send File */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<UploadIcon className="w-5 h-5" />
						1. Send File
					</CardTitle>
					<CardDescription>
						Upload and encrypt a file to send to a recipient
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div>
							<Label htmlFor="file-upload">Select File</Label>
							<Input
								id="file-upload"
								type="file"
								onChange={handleFileSelect}
								accept="*/*"
							/>
							{fileToUpload && (
								<p className="text-sm text-muted-foreground mt-1">
									Selected: {fileToUpload.name} ({fileToUpload.size} bytes)
								</p>
							)}
						</div>
						<div>
							<Label htmlFor="recipient-address">Recipient Address</Label>
							<Input
								id="recipient-address"
								placeholder="0x..."
								value={recipientAddress}
								onChange={(e) => setRecipientAddress(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="recipient-encryption-key">
								Recipient Encryption Public Key
							</Label>
							<Input
								id="recipient-encryption-key"
								placeholder="Enter recipient's encryption public key..."
								value={recipientEncryptionKey}
								onChange={(e) => setRecipientEncryptionKey(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="file-tags">Tags (Optional)</Label>
							<Input
								id="file-tags"
								placeholder="Comma-separated tags (e.g., contract, legal, important)..."
								value={fileTags}
								onChange={(e) => setFileTags(e.target.value)}
							/>
						</div>
						<Button
							onClick={handleFileUpload}
							disabled={
								!fileToUpload ||
								!recipientAddress.trim() ||
								!recipientEncryptionKey.trim() ||
								sendFile.isPending
							}
							className="w-full"
							size="lg"
						>
							{sendFile.isPending ? (
								<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<UploadIcon className="w-4 h-4 mr-2" />
							)}
							Send File
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Acknowledge File */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CheckCircleIcon className="w-5 h-5" />
						2. Acknowledge File
					</CardTitle>
					<CardDescription>
						Acknowledge receipt of a file sent to you
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div>
							<Label htmlFor="piece-cid-ack">Piece CID</Label>
							<Input
								id="piece-cid-ack"
								placeholder="Enter piece CID to acknowledge..."
								value={pieceCidToAck}
								onChange={(e) => setPieceCidToAck(e.target.value)}
							/>
						</div>
						<Button
							onClick={handleAckFile}
							disabled={!pieceCidToAck.trim() || ackFile.isPending}
							className="w-full"
							size="lg"
						>
							{ackFile.isPending ? (
								<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<CheckCircleIcon className="w-4 h-4 mr-2" />
							)}
							Acknowledge File
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Get File Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<EyeIcon className="w-5 h-5" />
						3. Get File Info
					</CardTitle>
					<CardDescription>
						Get metadata and information about a file by its piece CID
						(populates download fields)
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div>
							<Label htmlFor="piece-cid-info">Piece CID</Label>
							<Input
								id="piece-cid-info"
								placeholder="Enter piece CID..."
								value={pieceCidToView}
								onChange={(e) => setPieceCidToView(e.target.value)}
							/>
						</div>
						<Button
							onClick={handleViewFileDetails}
							disabled={!pieceCidToView.trim()}
							className="w-full"
							size="lg"
						>
							<EyeIcon className="w-4 h-4 mr-2" />
							Get File Info
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Download File */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<DownloadIcon className="w-5 h-5" />
						4. Download File
					</CardTitle>
					<CardDescription>
						Download and decrypt file content using the piece CID and KEM
						ciphertext
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<div>
							<Label htmlFor="piece-cid-download">Piece CID</Label>
							<Input
								id="piece-cid-download"
								placeholder="Enter piece CID..."
								value={pieceCidToView}
								onChange={(e) => setPieceCidToView(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="kem-ciphertext">KEM Ciphertext</Label>
							<Input
								id="kem-ciphertext"
								placeholder="Enter KEM ciphertext..."
								value={kemCiphertext}
								onChange={(e) => setKemCiphertext(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="encrypted-encryption-key">
								Encrypted Encryption Key
							</Label>
							<Input
								id="encrypted-encryption-key"
								placeholder="Enter encrypted encryption key..."
								value={encryptedEncryptionKey}
								onChange={(e) => setEncryptedEncryptionKey(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="file-status">Storage Status</Label>
							<select
								id="file-status"
								value={fileStatus}
								onChange={(e) => setFileStatus(e.target.value as "s3" | "foc")}
								className="w-full px-3 py-2 border border-input bg-background rounded-md"
							>
								<option value="s3">S3 Storage</option>
								<option value="foc">Filecoin</option>
							</select>
						</div>
					</div>
					<Button
						onClick={handleDownloadFile}
						disabled={
							!pieceCidToView.trim() ||
							!kemCiphertext.trim() ||
							!encryptedEncryptionKey.trim() ||
							viewFile.isPending
						}
						size="lg"
					>
						{viewFile.isPending ? (
							<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
						) : (
							<DownloadIcon className="w-4 h-4 mr-2" />
						)}
						Download File
					</Button>
				</CardContent>
			</Card>

			{/* Sign File */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<SignatureIcon className="w-5 h-5" />
						5. Sign File
					</CardTitle>
					<CardDescription>
						Sign a file you've received with your cryptographic signature
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div>
							<Label htmlFor="piece-cid-sign">Piece CID</Label>
							<Input
								id="piece-cid-sign"
								placeholder="Enter piece CID to sign..."
								value={pieceCidToSign}
								onChange={(e) => setPieceCidToSign(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="signature-bytes">Signature Bytes (hex)</Label>
							<Input
								id="signature-bytes"
								placeholder="Enter signature bytes in hex format..."
								value={signatureBytes}
								onChange={(e) => setSignatureBytes(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Enter your visual signature as hex bytes (e.g., from drawing or
								text)
							</p>
						</div>
						<Button
							onClick={handleSignFile}
							disabled={
								!pieceCidToSign.trim() ||
								!signatureBytes.trim() ||
								signFile.isPending
							}
							className="w-full"
							size="lg"
						>
							{signFile.isPending ? (
								<SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<SignatureIcon className="w-4 h-4 mr-2" />
							)}
							Sign File
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* File Info Display */}
			{fileInfo.data && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg">
							<FileTextIcon className="w-5 h-5" />
							File Information
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="bg-muted/50 p-4 rounded-lg">
							{fileInfo.isLoading ? (
								<div className="flex items-center gap-2 text-muted-foreground">
									<SpinnerIcon className="w-4 h-4 animate-spin" />
									Loading file info...
								</div>
							) : fileInfo.error ? (
								<div className="text-red-600">
									Error loading file info: {fileInfo.error.message}
								</div>
							) : (
								<pre className="text-xs whitespace-pre-wrap">
									{JSON.stringify(fileInfo.data, null, 2)}
								</pre>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Downloaded File Display */}
			{downloadedFile && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg">
							<DownloadIcon className="w-5 h-5" />
							Downloaded File
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="bg-muted/50 p-4 rounded-lg space-y-3">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-sm font-medium">File Name</Label>
									<p className="text-sm text-muted-foreground">
										{downloadedFile.fileName}
									</p>
								</div>
								<div>
									<Label className="text-sm font-medium">MIME Type</Label>
									<p className="text-sm text-muted-foreground">
										{downloadedFile.fileMIME}
									</p>
								</div>
								<div>
									<Label className="text-sm font-medium">File Size</Label>
									<p className="text-sm text-muted-foreground">
										{downloadedFile.fileBytes.length} bytes
									</p>
								</div>
								<div>
									<Label className="text-sm font-medium">Tags</Label>
									<p className="text-sm text-muted-foreground">
										{downloadedFile.fileTags &&
										downloadedFile.fileTags.length > 0
											? downloadedFile.fileTags.join(", ")
											: "No tags"}
									</p>
								</div>
							</div>
							<div className="pt-2">
								<Button
									onClick={() => {
										const arrayBuffer = new ArrayBuffer(
											downloadedFile.fileBytes.length,
										);
										new Uint8Array(arrayBuffer).set(downloadedFile.fileBytes);
										const blob = new Blob([arrayBuffer], {
											type: downloadedFile.fileMIME,
										});
										const url = URL.createObjectURL(blob);
										const a = document.createElement("a");
										a.href = url;
										a.download = downloadedFile.fileName;
										document.body.appendChild(a);
										a.click();
										document.body.removeChild(a);
										URL.revokeObjectURL(url);
									}}
									size="sm"
								>
									<DownloadIcon className="w-4 h-4 mr-2" />
									Save File
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
