"""
AIKEN format parser for question bank import.

AIKEN format example:
    What is the capital of India?
    A. Mumbai
    B. Delhi
    C. Chennai
    D. Kolkata
    ANSWER: B

Rules:
- Questions are separated by blank lines
- First line is the question text
- Lines starting with A., B., C., D. are options
- Line starting with ANSWER: specifies the correct option
- Exactly 4 options required
- Exactly one ANSWER required
- ANSWER must be A, B, C, or D
"""
import re
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class ParsedQuestion:
    """Represents a parsed question from AIKEN format."""
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str  # 'A', 'B', 'C', or 'D'


@dataclass
class ParseError:
    """Represents a parsing error with location information."""
    line_number: int
    message: str
    block_text: Optional[str] = None


class AikenParseResult:
    """Result of parsing an AIKEN format file."""
    
    def __init__(self):
        self.questions: List[ParsedQuestion] = []
        self.errors: List[ParseError] = []
    
    @property
    def is_successful(self) -> bool:
        """Returns True if no errors occurred."""
        return len(self.errors) == 0
    
    @property
    def questions_count(self) -> int:
        """Returns the number of successfully parsed questions."""
        return len(self.questions)
    
    def add_question(self, question: ParsedQuestion):
        """Add a successfully parsed question."""
        self.questions.append(question)
    
    def add_error(self, line_number: int, message: str, block_text: str = None):
        """Add a parsing error."""
        self.errors.append(ParseError(line_number, message, block_text))


class AikenParser:
    """
    Parser for AIKEN format question files.
    
    Usage:
        parser = AikenParser()
        result = parser.parse(file_content)
        
        if result.is_successful:
            for q in result.questions:
                # Process question
        else:
            for error in result.errors:
                print(f"Line {error.line_number}: {error.message}")
    """
    
    # Regex patterns
    OPTION_PATTERN = re.compile(r'^([A-D])\.\s*(.+)$', re.IGNORECASE)
    ANSWER_PATTERN = re.compile(r'^ANSWER:\s*([A-Da-d])\s*$', re.IGNORECASE)
    
    def parse(self, content: str) -> AikenParseResult:
        """
        Parse AIKEN format content.
        
        Args:
            content: The file content as a string
            
        Returns:
            AikenParseResult with parsed questions and any errors
        """
        result = AikenParseResult()
        
        # Normalize line endings and split into blocks
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        
        # Split by blank lines (one or more empty lines)
        blocks = re.split(r'\n\s*\n', content.strip())
        
        # Track line numbers
        current_line = 1
        
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            
            # Parse this block
            block_start_line = current_line
            parsed, error = self._parse_block(block, block_start_line)
            
            if error:
                result.add_error(error.line_number, error.message, block)
            elif parsed:
                result.add_question(parsed)
            
            # Update line counter (count lines in block + blank line separator)
            current_line += block.count('\n') + 2  # +2 for blank line separator
        
        return result
    
    def _parse_block(self, block: str, start_line: int) -> Tuple[Optional[ParsedQuestion], Optional[ParseError]]:
        """
        Parse a single question block.
        
        Args:
            block: The text block containing one question
            start_line: The line number where this block starts
            
        Returns:
            Tuple of (ParsedQuestion or None, ParseError or None)
        """
        lines = block.strip().split('\n')
        lines = [line.strip() for line in lines if line.strip()]
        
        if len(lines) < 6:  # question + 4 options + answer
            return None, ParseError(
                start_line,
                f"Invalid block: expected at least 6 lines (question, 4 options, answer), found {len(lines)}"
            )
        
        # Extract question text (first line, or multiple lines until we hit an option)
        question_lines = []
        option_start_idx = 0
        
        for i, line in enumerate(lines):
            if self.OPTION_PATTERN.match(line):
                option_start_idx = i
                break
            question_lines.append(line)
        
        if not question_lines:
            return None, ParseError(start_line, "No question text found")
        
        question_text = ' '.join(question_lines)
        
        # Extract options
        options: Dict[str, str] = {}
        answer_line_idx = None
        correct_answer = None
        
        for i, line in enumerate(lines[option_start_idx:], start=option_start_idx):
            # Check for ANSWER line
            answer_match = self.ANSWER_PATTERN.match(line)
            if answer_match:
                answer_line_idx = i
                correct_answer = answer_match.group(1).upper()
                continue
            
            # Check for option line
            option_match = self.OPTION_PATTERN.match(line)
            if option_match:
                label = option_match.group(1).upper()
                text = option_match.group(2).strip()
                
                if label in options:
                    return None, ParseError(
                        start_line + i,
                        f"Duplicate option '{label}' found"
                    )
                
                options[label] = text
        
        # Validate options
        required_options = {'A', 'B', 'C', 'D'}
        found_options = set(options.keys())
        
        if found_options != required_options:
            missing = required_options - found_options
            extra = found_options - required_options
            
            error_parts = []
            if missing:
                error_parts.append(f"missing options: {', '.join(sorted(missing))}")
            if extra:
                error_parts.append(f"unexpected options: {', '.join(sorted(extra))}")
            
            return None, ParseError(
                start_line,
                f"Invalid options - {'; '.join(error_parts)}. Exactly 4 options (A, B, C, D) required."
            )
        
        # Validate answer
        if correct_answer is None:
            return None, ParseError(
                start_line,
                "No ANSWER line found. Format: ANSWER: X (where X is A, B, C, or D)"
            )
        
        if correct_answer not in required_options:
            return None, ParseError(
                start_line + (answer_line_idx or 0),
                f"Invalid answer '{correct_answer}'. Must be A, B, C, or D."
            )
        
        return ParsedQuestion(
            question_text=question_text,
            option_a=options['A'],
            option_b=options['B'],
            option_c=options['C'],
            option_d=options['D'],
            correct_option=correct_answer
        ), None


def parse_aiken_file(content: str) -> AikenParseResult:
    """
    Convenience function to parse AIKEN format content.
    
    Args:
        content: The file content as a string
        
    Returns:
        AikenParseResult with parsed questions and any errors
    """
    parser = AikenParser()
    return parser.parse(content)
