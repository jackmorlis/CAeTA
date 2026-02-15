import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";


const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Name is required").max(50, "Name must be less than 50 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  confirmEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  reason: z.string().min(1, "Reason is required"),
  content: z.string().trim().min(1, "Content is required").max(1000, "Content must be less than 1000 characters")
}).refine(data => data.email === data.confirmEmail, {
  message: "Emails don't match",
  path: ["confirmEmail"]
});
type ContactFormData = z.infer<typeof contactSchema>;
const Contact = () => {
  const {
    toast
  } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      confirmEmail: "",
      reason: "",
      content: ""
    }
  });
  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      // Save to database via API
      await apiClient.submitContact({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        subject: data.reason,
        message: data.content || data.message || ""
      });
      toast({
        title: "Message sent!",
        description: "Thank you for contacting us. We'll get back to you soon."
      });
      form.reset();
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-12 font-quicksand">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-soft p-6 md:p-12">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Contact Us</h1>
              <p className="text-lg text-slate-600">Get your questions answered or request a refund</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Name and Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="firstName" render={({
                  field
                }) => <FormItem className="space-y-3">
                        <FormLabel className="text-lg font-bold text-slate-800">
                          Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Wilson" className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="lastName" render={({
                  field
                }) => <FormItem className="space-y-3">
                        <FormLabel className="text-lg font-bold text-slate-800">
                          Last Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Johnson" className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                {/* Email and Confirm Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="email" render={({
                  field
                }) => <FormItem className="space-y-3">
                        <FormLabel className="text-lg font-bold text-slate-800">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="wilson@johnson.com" className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="confirmEmail" render={({
                  field
                }) => <FormItem className="space-y-3">
                        <FormLabel className="text-lg font-bold text-slate-800">
                          Confirm Email
                        </FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="wilson@johnson.com" className="h-12 border-2 border-gray-200 hover:border-primary focus:border-primary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                {/* Reason */}
                <FormField control={form.control} name="reason" render={({
                field
              }) => <FormItem className="space-y-3">
                      <FormLabel className="text-lg font-bold text-slate-800">
                        Reason
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-primary">
                            <SelectValue placeholder="Select one" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="question">General Question</SelectItem>
                          <SelectItem value="refund">Request Refund</SelectItem>
                          <SelectItem value="technical">Technical Support</SelectItem>
                          <SelectItem value="complaint">Complaint</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />

                {/* Content */}
                <FormField control={form.control} name="content" render={({
                field
              }) => <FormItem className="space-y-3">
                      <FormLabel className="text-lg font-bold text-slate-800">
                        Content
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="Please describe your question or issue in detail..." className="min-h-[120px] border-2 border-gray-200 hover:border-primary focus:border-primary resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                {/* Submit Button */}
                <div className="pt-6">
                  <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-4 text-lg rounded-lg shadow-md hover:shadow-lg transition-all">
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>

      <Footer />
    </div>;
};
export default Contact;