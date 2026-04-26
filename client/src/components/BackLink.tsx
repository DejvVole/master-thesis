import { Link } from 'react-router-dom';
import { Box, Flex } from '@chakra-ui/react';
import { IoMdArrowRoundBack } from 'react-icons/io';

export default function BackLink() {
	return (
		<Link to="/">
			<Flex
				_hover={{ color: 'action.primaryHover' }}
				fontWeight="medium"
				align="center"
				gap="2"
				transition="colors 0.2s"
			>
				<Box as={IoMdArrowRoundBack} transition="transform 0.2s" />
				Späť na vyhľadávanie
			</Flex>
		</Link>
	);
}
