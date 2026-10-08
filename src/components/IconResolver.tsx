import React from 'react';
import {
  Merge,
  Split,
  LayoutGrid,
  RotateCw,
  Binary,
  Crop,
  Minimize2,
  Wrench,
  Archive,
  FileText,
  Presentation,
  Sheet,
  Image,
  FileCheck,
  SlidersHorizontal,
  Table,
  FileImage,
  Code,
  Camera,
  PenTool,
  FileSignature as Signature,
  Stamp,
  Lock,
  Unlock,
  EyeOff,
  ScanText,
  GitCompare,
  CheckSquare,
  HelpCircle,
} from 'lucide-react';

interface IconResolverProps {
  name: string;
  className?: string;
}

export const IconResolver: React.FC<IconResolverProps> = ({ name, className = 'w-6 h-6' }) => {
  switch (name) {
    case 'Merge':
      return <Merge className={className} />;
    case 'Split':
      return <Split className={className} />;
    case 'LayoutGrid':
      return <LayoutGrid className={className} />;
    case 'RotateCw':
      return <RotateCw className={className} />;
    case 'Binary':
      return <Binary className={className} />;
    case 'Crop':
      return <Crop className={className} />;
    case 'Minimize2':
      return <Minimize2 className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Archive':
      return <Archive className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'Presentation':
      return <Presentation className={className} />;
    case 'Sheet':
      return <Sheet className={className} />;
    case 'Image':
      return <Image className={className} />;
    case 'FileCheck':
      return <FileCheck className={className} />;
    case 'SlidersHorizontal':
      return <SlidersHorizontal className={className} />;
    case 'Table':
      return <Table className={className} />;
    case 'FileImage':
      return <FileImage className={className} />;
    case 'Code':
      return <Code className={className} />;
    case 'Camera':
      return <Camera className={className} />;
    case 'PenTool':
      return <PenTool className={className} />;
    case 'Signature':
      return <Signature className={className} />;
    case 'Stamp':
      return <Stamp className={className} />;
    case 'Lock':
      return <Lock className={className} />;
    case 'Unlock':
      return <Unlock className={className} />;
    case 'EyeOff':
      return <EyeOff className={className} />;
    case 'ScanText':
      return <ScanText className={className} />;
    case 'GitCompare':
      return <GitCompare className={className} />;
    case 'CheckSquare':
      return <CheckSquare className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
};
