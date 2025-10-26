"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, RotateCcw, ChevronDown } from "lucide-react";
import type { FilterOptions } from "@/types/bulk-import";
import type { ExportFilters } from "./bulk-export-manager";

interface BulkExportFiltersProps {
  filterOptions: FilterOptions;
  onApplyFilters: (filters: ExportFilters) => void;
}

export function BulkExportFilters({
  filterOptions,
  onApplyFilters,
}: BulkExportFiltersProps) {
  const [format, setFormat] = useState<"excel" | "csv" | "json" | "">("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");
  const [limit, setLimit] = useState<string>("1000");
  const [status, setStatus] = useState<"active" | "inactive" | "all" | "">("");
  const [difficulty, setDifficulty] = useState<string[]>([]);

  const handleSubjectToggle = (subject: string) => {
    setSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleExamTypeToggle = (examType: string) => {
    setExamTypes((prev) =>
      prev.includes(examType)
        ? prev.filter((e) => e !== examType)
        : [...prev, examType]
    );
  };

  const handleDifficultyToggle = (level: string) => {
    setDifficulty((prev) =>
      prev.includes(level) ? prev.filter((d) => d !== level) : [...prev, level]
    );
  };

  const handleReset = () => {
    setFormat("");
    setSubjects([]);
    setExamTypes([]);
    setYearFrom("");
    setYearTo("");
    setLimit("1000");
    setStatus("");
    setDifficulty([]);
  };

  const handleApply = () => {
    onApplyFilters({
      format: format as "excel" | "csv" | "json",
      subjects,
      examTypes,
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status: status as "active" | "inactive" | "all",
      difficulty,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Filters</CardTitle>
        <CardDescription>
          Configure filters to select which questions to export
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select
              value={format}
              onValueChange={(value) =>
                setFormat(value as "excel" | "csv" | "json")
              }
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as "active" | "inactive" | "all")
              }
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
                <SelectItem value="all">All Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">Question Limit</Label>
            <Input
              id="limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="1000"
              min="1"
              max="10000"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subjects</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {subjects.length > 0
                    ? `${subjects.length} selected`
                    : "Select subjects"}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="max-h-64 overflow-y-auto p-4 space-y-2">
                  {filterOptions.subjects.map((subject) => (
                    <div key={subject} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subject-${subject}`}
                        checked={subjects.includes(subject)}
                        onCheckedChange={() => handleSubjectToggle(subject)}
                      />
                      <label
                        htmlFor={`subject-${subject}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {subject}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Exam Types</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {examTypes.length > 0
                    ? `${examTypes.length} selected`
                    : "Select exam types"}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="max-h-64 overflow-y-auto p-4 space-y-2">
                  {filterOptions.examTypes.map((examType) => (
                    <div key={examType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`examType-${examType}`}
                        checked={examTypes.includes(examType)}
                        onCheckedChange={() => handleExamTypeToggle(examType)}
                      />
                      <label
                        htmlFor={`examType-${examType}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {examType}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="yearFrom">Year From</Label>
            <Input
              id="yearFrom"
              type="number"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              placeholder="2010"
              min="2000"
              max={new Date().getFullYear()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearTo">Year To</Label>
            <Input
              id="yearTo"
              type="number"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              placeholder={new Date().getFullYear().toString()}
              min="2000"
              max={new Date().getFullYear()}
            />
          </div>

          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {difficulty.length > 0
                    ? `${difficulty.length} selected`
                    : "Select difficulty"}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="p-4 space-y-2">
                  {["easy", "medium", "hard"].map((level) => (
                    <div key={level} className="flex items-center space-x-2">
                      <Checkbox
                        id={`difficulty-${level}`}
                        checked={difficulty.includes(level)}
                        onCheckedChange={() => handleDifficultyToggle(level)}
                      />
                      <label
                        htmlFor={`difficulty-${level}`}
                        className="text-sm cursor-pointer flex-1 capitalize"
                      >
                        {level}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleApply}>
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
